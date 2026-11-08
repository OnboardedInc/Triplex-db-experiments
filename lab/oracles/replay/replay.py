"""Command-stream replay: expected outcomes, receipt consistency, assertion relation,
journal. RULES.md R-CMD-*, R-RCP-*, R-CON-*, R-JNL-*, R-LANE-*.

Outcome authority (R-CMD-0): the oracle decides which commands commit from the
captured command intent, stream order, preconditions and enforcement rules.
Receipts only bind system-generated identities (txId, position, instant,
assertion ids) and, inside a declared race group, the serial order the system
chose among the committed members. A receipt outcome that disagrees with the
expected outcome is reported as a mismatch; it never changes the expected state.

Every rejection carries its ACC 4.7 error id, tag and reason (R-CMD-9).

Erasure (TARGETS 7, RULINGS Q24, Q31f, Q49, Q52; RULES.md R-ERA-*): an `erase` command is
its own ordinary journaled commit whose changes name identities only, and marks the values it
erases. A read that starts after an erasure published returns `ErasedValue {erasedAt}` in
place of an erased value at any basis, with identities and intervals unchanged. Q49c: an
erased value matches no value predicate, value aggregates skip it, grouping keys it by the
marker, Unique ignores it and an erased reference is not followed; Q52: COUNT counts the
marker group as one value, ORDER BY puts readable values, then markers by assertion id, then
missing values, a marker group reports its earliest erasedAt, and ReferenceTarget skips an
erased reference. A read that started before an erasure commit published sees that commit
whole or not at all (Q52e); run.py answers it once per choice.
"""

from __future__ import annotations

import re
from fractions import Fraction

from . import errors as ERR
from . import values as V

DEFAULT_RULES = {
    # each default below is listed in RULES.md with its source or ORCHESTRATOR-RULING-NEEDED marker
    "retractNonLive": "transaction-conflict",   # R-CMD-5: transaction-conflict | invalid-operation | noop
    "validFromDefault": "transaction-instant",  # R-CMD-3
    "createdByDefault": "null",                 # R-CMD-3 ("null" or "actor")
    "emptyIntervalRejected": True,              # R-CMD-4, ruled by Q21 AMB-12 (B: reject, E-INVALID-VALUE)
    "attributeSyntax": "any",                   # R-CMD-6 ("any" or "agents-md")
    "retractPatternEmptyRejected": True,        # R-CMD-7 (empty pattern -> E-INVALID-VALUE)
    "retractPatternSeesStaged": True,           # R-CMD-7, ruled by Q21 AMB-06 (A: in order over staged facts)
    "typeMembership": "valid-at-instant",       # R-CON-2
    "journalChangeOrder": "operation-order",    # R-JNL-2, ruled by Q21 AMB-07 (creation order)
    "datetimeRange": None,                      # R-VAL-6 [low, high] lexemes or null
    "reservedNamespaces": None,                 # R-CMD-6 override; default RESERVED below
}

# R-CMD-6 (brief fact 2; TK-RESERVED via V-O01 R-CMD-6; operational-primitives `_Transaction` and
# `:_tx/*` envelope facts): writes naming these are WriteError / reserved-namespace (E-RESERVED).
RESERVED = {
    "entityIdPrefixes": ["_triplex/"],
    "attributePrefixes": [":triplex/", ":_tx/"],
    "entityTypePrefixes": ["triplex."],
    "entityTypes": ["_Transaction"],
}

# R-LANE-1 (ACC 4.0 LANE_INTEGER_RANGE; NUMERIC; Q1 as re-scoped): each lane's accepted integer
# range. A value outside it fails the write with E-VALUE-OUT-OF-RANGE before any mutation. "core"
# (no lane named) is the core integer type, which equals the XTDB lane's BIGINT range.
INT53 = 2 ** 53 - 1
LANE_INTEGER_RANGE = {
    "core": (V.INT64_MIN, V.INT64_MAX),
    "xtdb": (V.INT64_MIN, V.INT64_MAX),
    "qlever": (-(2 ** 59), 2 ** 59 - 1),
}
LANE_ENGINE = {"xtdb-xtql": "xtdb", "xtdb-sql": "xtdb", "qlever-sparql": "qlever"}

# Receipts may name the rejection by the O-REPLAY 0.1 category names; they map onto ACC 4.7 ids.
LEGACY_CATEGORY = {
    "command-already-committed": "E-COMMAND-COMMITTED", "transaction-conflict": "E-TX-CONFLICT",
    "constraint-violation": "E-CONSTRAINT", "invalid-value": "E-INVALID-VALUE",
    "reserved-namespace": "E-RESERVED", "invalid-operation": "E-INVALID-VALUE",
    "value-out-of-range": "E-VALUE-OUT-OF-RANGE",
    # 0.1's "decimal-unrepresentable" is not mapped: 0.3.5 split it into E-DECIMAL-OVERFLOW and
    # E-DECIMAL-FRACTION (Q35e, RULINGS Q43a), so the old name cannot say which
}

JOURNAL_ATTRIBUTES = (":_tx/change", ":_tx/changed-entity")   # brief fact 4 (C6): modeled journal facts
JOURNAL_ENTITY_TYPE = "_Transaction"

_AGENTS_ATTRIBUTE = re.compile(r":[a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*\Z")


def normalize_category(category):
    if category is None:
        return None
    return LEGACY_CATEGORY.get(category, category)


class Rejected(Exception):
    """An expected rejection. `error_id` is an ACC 4.7 id, or "host-abort" (R-CMD-9: the
    host rolled the transaction back on purpose; the tag is host-defined)."""

    def __init__(self, error_id, message, *, reason=None, alternatives=None, **detail):
        super().__init__(f"{error_id}: {message}")
        self.category = error_id
        self.message = message
        self.reason = reason
        self.alternatives = alternatives
        self.detail = detail

    def to_output(self):
        out = [("outcome", "rejected")]
        if self.category == "host-abort":
            out += [("error", "host-abort"), ("errorTag", None), ("reason", None), ("phase", None),
                    ("ruling", "R-CMD-9: host-defined abort; Triplex pins no tag")]
        else:
            # a write-time rejection of a two-phase row (E-DECIMAL-OVERFLOW) is preflight
            phases = ERR.ERROR_TABLE.get(self.category, (None, None, None))[2]
            phase = "preflight" if isinstance(phases, tuple) else None
            for key, value in ERR.fields(self.category, self.reason, self.alternatives, phase=phase):
                out.append(("errorTag" if key == "_tag" else key, value))
        out.append(("message", self.message))
        for key, value in self.detail.items():
            out.append((key, value))
        return V.OrderedOut(out)

    def expected_tag(self):
        return None if self.category == "host-abort" else ERR.ERROR_TABLE[self.category][0]


# --------------------------------------------------------------------------- relation


class Assertion:
    __slots__ = ("id", "sym", "scope", "entityId", "attribute", "value", "entityType", "createdBy",
                 "validFrom", "validTo", "recordedAt", "recordedPosition", "schemaVersion", "txId",
                 "retractedAt", "retractedPosition", "retractTxId", "seq", "command", "journal",
                 "erasure", "about")   # erasure: ErasureMark or None; about: the change a :_tx/change fact describes

    def __init__(self, **fields):
        for key in self.__slots__:
            setattr(self, key, fields.get(key))

    def live_recorded(self):
        return self.retractedPosition is None

    def valid_at(self, v: Fraction):
        return self.validFrom.frac <= v and (self.validTo is None or v < self.validTo.frac)


def _num(n):
    return None if n is None else V.RawNumber(n.lexeme())


# --------------------------------------------------------------------------- erasure (R-ERA-*)


class ErasureMark:
    """The first erasure commit that erased an assertion's value: its instant (the marker's
    erasedAt), position, txId and scope."""

    def __init__(self, instant, position, tx_id, scope=None):
        self.instant, self.position, self.txId, self.scope = instant, position, tx_id, scope


# The read being answered. TARGETS 7.1: the boundary is the erasure commit's publication.
# `start` is None for a read that starts after every erasure of the case published (the
# default: the oracle answers after the whole command stream). A query's `readStart` sets it
# to the last position of `scope` published when the read started; RULINGS Q52e (an erasure
# commit is atomic for readers) then has run.py answer once per choice of which in-flight
# erasure commits (`chosen`, by position) the read sees, all of a commit's values or none.
READ = {"start": None, "scope": None, "chosen": frozenset()}


def erasure_applies(mark):
    """Does this read see the erasure commit `mark` names? (R-ERA-6, Q52e)"""
    if READ["start"] is None or mark.scope != READ["scope"] or mark.position <= READ["start"]:
        return True
    return mark.position in READ["chosen"]


def erased(a):
    """Is `a`'s value erased for the read being answered? (R-ERA-1, R-ERA-6)"""
    return a.erasure is not None and erasure_applies(a.erasure)


class ErasedValue:
    """What a read returns in place of erased values (TARGETS 7.1, Q24): the marker
    `{"_tag": "ErasedValue", "erasedAt": <the erasure commit's instant>}`. Q49c: all erased
    values of one attribute form one group keyed by the marker, so an ErasedValue may stand
    for several erased assertions; Q52c: the group's marker reports the earliest erasedAt
    among its members."""

    family = "erased"

    def __init__(self, *assertions):
        self.assertions = list(assertions)
        self.ids = sorted(a.id for a in self.assertions)

    def erased_at(self):
        return min((a.erasure.instant for a in self.assertions), key=lambda n: n.frac)

    def marker(self):
        return V.OrderedOut([("_tag", "ErasedValue"), ("erasedAt", _num(self.erased_at()))])

    def sort_key(self):
        """Q49c / Q52b: ORDER BY places erased markers after readable values, by assertion id."""
        return self.ids[0]

    def to_output(self):
        return self.marker()


def read_value(a):
    """The value a read returns for assertion `a` (R-ERA-1): its value, or ErasedValue. A
    `:_tx/change` fact describing an erased value is re-rendered with the marker in place
    of the value (Q49a: earlier transactions' change facts show the marker)."""
    if a.about is not None:
        kind, target, record = a.about
        if not erased(target):
            return a.value
        doc = V.JsonDoc(_json_node(change_output(kind, target, record)))
        return V.Value("json", doc.canonical, doc)
    return ErasedValue(a) if erased(a) else a.value


def value_matches(a, expected):
    """Q49c: an erased value matches no value predicate (equality, inequality, range,
    pattern). A journal change fact compares its re-rendered (marker) content."""
    if a.about is not None:
        return read_value(a) == expected
    if erased(a):
        return False
    return a.value == expected


def assertion_output(a: Assertion, *, mask=None):
    """Complete metadata row (spec item 4). ``mask`` = (P, R) applies the as-of
    snapshot retirement mask (spec item 6); None = raw lifetime (AMB-01 A)."""
    retired = a.retractedPosition is not None
    if retired and mask is not None:
        P, R = mask
        retired = a.retractedPosition <= P and (R is None or a.retractedAt.frac <= R)
    out = V.OrderedOut([
        ("id", a.id), ("entityId", a.entityId), ("attribute", a.attribute), ("value", read_value(a).to_output()),
        ("validFrom", _num(a.validFrom)), ("validTo", _num(a.validTo)),
        ("recordedAt", _num(a.recordedAt)), ("recordedPosition", a.recordedPosition),
        ("createdBy", a.createdBy), ("entityType", a.entityType), ("schemaVersion", a.schemaVersion),
        ("txId", a.txId),
        ("retractedAt", _num(a.retractedAt) if retired else None),
        ("retractedPosition", a.retractedPosition if retired else None),
        ("retractTxId", a.retractTxId if retired else None),
    ])
    if a.journal:
        # R-JNL-5: journal fact ids are system-generated and not in receipts; compare journal
        # facts by (entityId, attribute, value), never by this synthetic id
        out.append(("journal", True))
    return out


class TxRecord:
    def __init__(self, **fields):
        self.__dict__.update(fields)


class ScopeState:
    def __init__(self, name):
        self.name = name
        self.assertions = {}   # id -> Assertion, insertion order = creation order
        self.journal = []      # journal facts (Assertion with journal=True), R-JNL-5
        self.claims = {}       # commandId -> txId
        self.records = []      # TxRecord in position order
        self.last_position = 0
        self.seq = 0

    def live(self):
        return [a for a in self.assertions.values() if a.live_recorded()]

    def journal_ids(self):
        return {a.id for a in self.journal}

    def tx_ids(self):
        return {r.txId for r in self.records if not r.internal}


# --------------------------------------------------------------------------- planning


class Plan:
    def __init__(self):
        self.asserts = []    # (opIndex, dict of fields)
        self.retracts = []   # (opIndex, target, explicit); target = existing id or ("staged", assertOpIndex)
        self.changes = []    # ("assert", opIndex) / ("retract", target) in journal order
        self.erasures = []   # assertion ids an erase command erases (R-ERA-2), in creation order


def _str_field(raw, name, required=False):
    value = raw.get(name)
    if value is None:
        if required:
            raise Rejected("E-INVALID-VALUE", f"missing {name}")
        return None
    if not isinstance(value, str) or isinstance(value, V.Lex):
        raise Rejected("E-INVALID-VALUE", f"{name} must be a string")
    if V.has_lone_surrogate(value):
        raise Rejected("E-INVALID-VALUE", f"{name} contains a lone surrogate")
    return value


def _creation(a):
    """AMB-07 / R-JNL-2: creation order = (recordedPosition, operation index)."""
    return (a.recordedPosition, a.seq)


class Engine:
    def __init__(self, case_rules=None, adapter=None, schemas=None, enforcement=None, default_scope="default",
                 lane=None, lane_ranges=None, declarations=None):
        self.rules = dict(DEFAULT_RULES)
        self.rules.update(case_rules or {})
        self.adapter = adapter or {}
        self.schemas = schemas or {}
        self.enforcement = enforcement or {"mode": "off"}
        self.default_scope = default_scope
        self.scopes = {}
        self.sym_ids = {}        # (scope, sym) -> assertion id
        self.dt_range = None
        if self.rules.get("datetimeRange"):
            low, high = self.rules["datetimeRange"]
            self.dt_range = (None if low is None else V.Num.parse(low).frac,
                             None if high is None else V.Num.parse(high).frac)
        self.reserved = dict(RESERVED)
        self.reserved.update(self.rules.get("reservedNamespaces") or {})
        self.lane, self.lane_range = resolve_lane(lane, lane_ranges)
        self.declarations = declarations or {}

    def scope(self, name):
        if name not in self.scopes:
            self.scopes[name] = ScopeState(name)
        return self.scopes[name]

    # ---- validation helpers

    def _check_reserved(self, entity_id=None, attribute=None, entity_type=None):
        """R-CMD-6 / AMB-14: reserved namespaces are WriteError / reserved-namespace."""
        ns = self.reserved
        if entity_id is not None and any(entity_id.startswith(p) for p in ns["entityIdPrefixes"]):
            raise Rejected("E-RESERVED", f"entity id {entity_id} is in a reserved Triplex system namespace")
        if attribute is not None and any(attribute.startswith(p) for p in ns["attributePrefixes"]):
            raise Rejected("E-RESERVED", f"attribute {attribute} is in a reserved Triplex system namespace")
        if entity_type is not None and (entity_type in ns["entityTypes"]
                                        or any(entity_type.startswith(p) for p in ns["entityTypePrefixes"])):
            raise Rejected("E-RESERVED", f"entity type {entity_type} is in a reserved Triplex system namespace")

    def _check_lane(self, value):
        """R-LANE-1 (ACC 4.0 integer, LANE_INTEGER_RANGE): an integer outside the lane's
        declared range fails the write with E-VALUE-OUT-OF-RANGE, never wrapped or widened."""
        if value.family == "integer":
            low, high = self.lane_range
            if not low <= value.payload <= high:
                raise Rejected("E-VALUE-OUT-OF-RANGE",
                               f"integer {value.payload} is outside the {self.lane} lane range [{low}, {high}]",
                               lane=self.lane)

    def _decode_written(self, raw, attribute):
        """Decode a written value: value domain (E-INVALID-VALUE), decimal declaration
        (Q18; E-DECIMAL-FRACTION / E-DECIMAL-OVERFLOW, Q43a), lane range (E-VALUE-OUT-OF-RANGE)."""
        try:
            value = V.decode_value(raw, datetime_range=self.dt_range)
            if value.family == "decimal":
                value = self._declare(value, attribute)
        except V.InvalidValue as error:
            raise _value_rejection(error)
        self._check_lane(value)
        return value

    def _declare(self, value, attribute):
        """Q18: every decimal attribute declares precision and scale. The declaration
        comes from the case's attributeDeclarations or a schema release (run.py); inline
        precision/scale on the value must agree with it. An undeclared decimal is refused
        with E-INVALID-VALUE (R-DEC-0: Q18 makes the declaration mandatory)."""
        decl = self.declarations.get(attribute)
        inline = value.extra[2]
        if decl is None:
            if not inline:
                raise V.InvalidValue("decimal", f"attribute {attribute} declares no decimal precision and scale (Q18)")
            return value
        precision, scale = decl
        if inline and (value.extra[1], value.extra[0]) != (precision, scale):
            raise V.OracleInputError(f"decimal precision/scale on the value disagree with {attribute}'s declaration")
        return V.declare_decimal(value, precision, scale, attribute)

    def _resolve_target(self, state, op):
        if "target" in op:
            key = (state.name, op["target"])
            if key not in self.sym_ids:
                raise Rejected("E-INVALID-VALUE", f"retract target {op['target']} is not a committed assertion")
            return self.sym_ids[key]
        target = _str_field(op, "id", required=True)
        if target in state.journal_ids():
            # TK-JOURNAL-RETRACT / C6-05 C2: journal facts are system facts
            raise Rejected("E-RESERVED", f"{target} is a journal fact in the reserved Triplex system namespace")
        if target not in state.assertions:
            raise Rejected("E-INVALID-VALUE", f"retract id {target} is unknown in scope {state.name}")
        return target

    def _decode_pattern(self, state, raw):
        pattern = {}
        for key in ("entityId", "attribute", "entityType"):
            if key in raw:
                pattern[key] = _str_field(raw, key)
        unknown = set(raw) - {"entityId", "attribute", "entityType", "value"}
        if unknown:
            raise Rejected("E-INVALID-VALUE", f"unknown pattern fields {sorted(unknown)}")
        if not pattern and "value" not in raw and self.rules["retractPatternEmptyRejected"]:
            raise Rejected("E-INVALID-VALUE", "empty retract pattern")
        self._check_reserved(pattern.get("entityId"), pattern.get("attribute"), pattern.get("entityType"))
        if pattern.get("entityId") in state.tx_ids():
            # R-CMD-12 (RULING-NEEDED): a pattern on a transaction entity targets journal facts
            raise Rejected("E-RESERVED", f"entity {pattern['entityId']} is a transaction envelope (journal)")
        if "value" in raw:
            try:
                pattern["value"] = V.decode_value(raw["value"], datetime_range=self.dt_range)
            except V.InvalidValue as error:
                raise _value_rejection(error)
            # R-LANE-2 (ruled by Q33c): a pattern value the lane cannot hold is refused like a write.
            # A decimal pattern value matches by exact value (identity), so it needs no declaration.
            self._check_lane(pattern["value"])
        return pattern

    @staticmethod
    def _matches(fields, pattern):
        """Pattern match on entityId/attribute/entityType and value identity (R-VAL-3)."""
        return all((
            "entityId" not in pattern or fields["entityId"] == pattern["entityId"],
            "attribute" not in pattern or fields["attribute"] == pattern["attribute"],
            "entityType" not in pattern or fields["entityType"] == pattern["entityType"],
            "value" not in pattern or fields["value"] == pattern["value"],
        ))

    def plan(self, state, command, instant):
        """Validate a command against `state` and return a Plan or raise Rejected.

        Precedence (R-CMD-8): operation validation (E-INVALID-VALUE, E-DECIMAL-FRACTION, E-DECIMAL-OVERFLOW,
        E-VALUE-OUT-OF-RANGE, E-RESERVED, in operation order) -> command claim -> preconditions
        -> retract liveness -> constraint enforcement.
        """
        plan = Plan()
        operations = command.get("operations")
        if not isinstance(operations, list):
            raise V.OracleInputError("command.operations must be a list")
        meta = command.get("meta") or {}
        kinds = {op.get("op") for op in operations if isinstance(op, dict)}
        if "erase" in kinds:
            self._check_erase_command(kinds, meta)
        retracted = []          # targets retracted so far by this command, in order
        staged = []             # (opIndex, fields) of this command's asserts so far (AMB-06 A)
        for index, op in enumerate(operations):
            kind = op.get("op")
            if kind == "assert":
                fields = self._plan_assert(op, meta, instant)
                plan.asserts.append((index, fields))
                plan.changes.append(("assert", index))
                staged.append((index, fields))
            elif kind == "retract":
                target = self._resolve_target(state, op)
                existing = state.assertions[target]
                self._check_reserved(existing.entityId, existing.attribute, existing.entityType)
                if target in retracted:
                    raise Rejected("E-INVALID-VALUE", f"retract {target} appears twice")
                retracted.append(target)
                plan.retracts.append((index, target, True))
                plan.changes.append(("retract", target))
            elif kind == "retract-pattern":
                pattern = self._decode_pattern(state, op.get("pattern") or V.Obj([]))
                # AMB-06 A: operations apply in order over staged facts, so the pattern sees the
                # pre-state's recorded-live assertions and this command's earlier asserts; AMB-07:
                # matches expand in creation order (pre-state first, then staged in op order)
                # Q49c: an erased value matches no value pattern
                matched = [a.id for a in sorted(state.live(), key=_creation)
                           if self._matches(_fields_of(a), pattern) and not ("value" in pattern and a.erasure is not None)]
                if self.rules["retractPatternSeesStaged"]:
                    matched += [("staged", k) for k, f in staged if self._matches(f, pattern)]
                for target in matched:
                    if target not in retracted:
                        retracted.append(target)
                        plan.retracts.append((index, target, False))
                        plan.changes.append(("retract", target))
            elif kind == "erase":
                for target in self._plan_erase(state, op):
                    if target not in plan.erasures:
                        plan.erasures.append(target)
            else:
                # R-CMD-9 (Q33f): an operation fault with no ERROR_TABLE row; Q52g: `erasure` is not an
                # op (the op is spelled `erase`), so it is this typed invalid-command error too
                raise Rejected("E-INVALID-VALUE", f"unknown op {kind!r}")
        # command claim (R-CMD-1)
        command_id = meta.get("commandId")
        if command_id is not None and command_id in state.claims:
            raise Rejected("E-COMMAND-COMMITTED", "command id already committed",
                           commandId=command_id, transactionId=state.claims[command_id])
        # preconditions (R-CMD-2)
        explicit = {target for _, target, is_explicit in plan.retracts if is_explicit}
        for pre in meta.get("preconditions") or []:
            tag = pre.get("_tag")
            if tag == "TripleLive":
                target = self._resolve_target(state, pre)
                if target not in explicit:
                    raise Rejected("E-INVALID-VALUE", "TripleLive precondition without a matching retract",
                                   tripleId=target)
                if not state.assertions[target].live_recorded():
                    raise Rejected("E-TX-CONFLICT", "TripleLive precondition no longer holds", tripleId=target)
            elif tag == "EntityState":
                entity = _str_field(pre, "entityId", required=True)
                observed = set()
                for item in pre.get("tripleIds") or []:
                    observed.add(item)
                for sym in pre.get("targets") or []:
                    key = (state.name, sym)
                    observed.add(self.sym_ids.get(key, "<unresolved:" + sym + ">"))
                actual = {a.id for a in state.live() if a.entityId == entity}
                if observed != actual:
                    raise Rejected("E-TX-CONFLICT", "EntityState precondition no longer holds", entityId=entity)
            else:
                raise Rejected("E-INVALID-VALUE", f"unknown precondition {tag!r}")
        # retract liveness (R-CMD-5)
        mode = self.rules["retractNonLive"]
        for _, target, is_explicit in plan.retracts:
            if is_explicit and not state.assertions[target].live_recorded():
                if mode == "noop":
                    continue
                raise Rejected(normalize_category(mode), "retract of an assertion that is no longer live",
                               tripleId=target)

        def live(target):
            return isinstance(target, tuple) or state.assertions[target].live_recorded()
        plan.retracts = [(i, t, e) for i, t, e in plan.retracts if live(t)]
        plan.changes = [c for c in plan.changes if c[0] == "assert" or live(c[1])]
        # constraint enforcement (R-CON-*)
        rules = self.rules_for(command)
        if rules:
            # R-ERA-4: Unique ignores erased values (Q49c) and ReferenceTarget skips an erased reference
            # (Q52d), both in constraints.py; Required and Cardinality read presence and counts, which
            # erasure keeps (Q56e).
            from .constraints import newly_violated
            violations = newly_violated(self, state, plan, rules, instant)
            if violations:
                codes = sorted({v["code"] for v in violations})
                raise Rejected("E-CONSTRAINT", "new or worsened constraint violation",
                               reason=codes[0] if len(codes) == 1 else None, alternatives=codes,
                               codes=codes, violations=[V.OrderedOut(v.items()) for v in violations])
        return plan

    @staticmethod
    def _check_erase_command(kinds, meta):
        """R-ERA-2 (Q52g): an erase is its own command. Mixing it with other operations, or
        giving it preconditions, is a typed invalid-command error: E-INVALID-VALUE, the ACC 4.7
        mapping of an operation fault with no row of its own (R-CMD-9, Q33f)."""
        if kinds != {"erase"}:
            raise Rejected("E-INVALID-VALUE", "an erase is its own command: it cannot be mixed with other "
                           "operations (Q52g)")
        if meta.get("preconditions"):
            raise Rejected("E-INVALID-VALUE", "an erase command takes no preconditions (Q52g)")

    def _plan_erase(self, state, op):
        """R-ERA-2: `{"op": "erase", "entityId": E, "attribute": A}` erases the value of every
        assertion of E's attribute A recorded so far, live or retracted (history included);
        `{"op": "erase", "entityId": E}` every application assertion of E; `{"op": "erase",
        "target": ref}` / `{"op": "erase", "id": id}` one assertion. Reserved names are
        E-RESERVED (R-CMD-6), journal facts and transaction entities included."""
        unknown = set(op) - {"op", "entityId", "attribute", "target", "id"}
        if unknown:
            raise Rejected("E-INVALID-VALUE", f"unknown erase fields {sorted(unknown)}")
        if "target" in op or "id" in op:
            if "entityId" in op or "attribute" in op:
                raise Rejected("E-INVALID-VALUE", "erase names either an assertion or an entity (and attribute)")
            target = self._resolve_target(state, op)
            existing = state.assertions[target]
            self._check_reserved(existing.entityId, existing.attribute, existing.entityType)
            return [target]
        entity = _str_field(op, "entityId", required=True)
        attribute = _str_field(op, "attribute")
        self._check_reserved(entity, attribute)
        if entity in state.tx_ids():
            raise Rejected("E-RESERVED", f"entity {entity} is a transaction envelope (journal)")
        return [a.id for a in sorted(state.assertions.values(), key=_creation)
                if a.entityId == entity and (attribute is None or a.attribute == attribute)]

    def _plan_assert(self, op, meta, instant):
        entity_id = _str_field(op, "entityId", required=True)
        if entity_id == "":
            raise Rejected("E-INVALID-VALUE", "empty entity id")
        attribute = _str_field(op, "attribute", required=True)
        entity_type = _str_field(op, "entityType")
        self._check_reserved(entity_id, attribute, entity_type)
        if self.rules["attributeSyntax"] == "agents-md" and not _AGENTS_ATTRIBUTE.match(attribute):
            raise Rejected("E-INVALID-VALUE", f"attribute {attribute} does not match docs/agents.md syntax")
        if "value" not in op:
            raise Rejected("E-INVALID-VALUE", "missing value")
        value = self._decode_written(op["value"], attribute)
        try:
            valid_from = V.Num.parse(op["validFrom"], "validFrom") if op.get("validFrom") is not None else None
            valid_to = V.Num.parse(op["validTo"], "validTo") if op.get("validTo") is not None else None
        except V.InvalidValue as error:
            raise Rejected("E-INVALID-VALUE", str(error))
        for name, n in (("validFrom", valid_from), ("validTo", valid_to)):
            if n is not None and n.bits == V.NEG_ZERO_BITS:
                # Q30b / WR-INSTANT: an instant given as -0 is rejected, never turned into 0
                raise Rejected("E-NEGATIVE-ZERO-INSTANT", f"{name} given as -0", detail="no-negative-zero")
        if valid_from is None:
            if self.rules["validFromDefault"] != "transaction-instant":
                raise Rejected("E-INVALID-VALUE", "validFrom is required by this case's rules")
            valid_from = instant
        if valid_to is not None and self.rules["emptyIntervalRejected"] and valid_to.frac <= valid_from.frac:
            # Q21 AMB-12 (B): an interval that can never be visible is refused, not a silent no-op
            raise Rejected("E-INVALID-VALUE", "validTo must be after validFrom")
        created_by = _str_field(op, "createdBy")
        if created_by is None and self.rules["createdByDefault"] == "actor":
            created_by = meta.get("actor")
        return dict(entityId=entity_id, attribute=attribute, value=value, entityType=entity_type,
                    createdBy=created_by, validFrom=valid_from, validTo=valid_to, sym=op.get("ref"))

    def rules_for(self, command):
        meta = command.get("meta") or {}
        enforce = meta.get("enforce")
        if enforce is None and self.enforcement.get("mode") == "on":
            enforce = self.enforcement
        if not enforce:
            return []
        rules = list(enforce.get("constraints") or enforce.get("rules") or [])
        if enforce.get("fromSchema") is not None:
            from .entities import schema_rules
            rules.extend(schema_rules(self.schemas, int(enforce["fromSchema"])))
        return rules

    # ---- applying

    def apply(self, state, command, plan, identity):
        """identity: txId, position, instant (Num), assertionIds (list aligned to ops)."""
        position, instant, tx_id = identity["position"], identity["instant"], identity["txId"]
        created = {}
        for op_index, fields in plan.asserts:
            assertion_id = identity["assertionIds"][op_index]
            state.seq += 1
            a = Assertion(id=assertion_id, scope=state.name, recordedAt=instant, recordedPosition=position,
                          schemaVersion=self.adapter.get("schemaVersion"), txId=tx_id, seq=state.seq,
                          command=command["_index"], **{k: v for k, v in fields.items()})
            if assertion_id in state.assertions:
                raise V.OracleInputError(f"assertion id {assertion_id} reused")
            state.assertions[assertion_id] = a
            created[op_index] = a
            if fields.get("sym") is not None:
                self.sym_ids[(state.name, fields["sym"])] = assertion_id

        def target_of(target):
            return created[target[1]] if isinstance(target, tuple) else state.assertions[target]
        for _, target, _ in plan.retracts:
            a = target_of(target)
            a.retractedAt, a.retractedPosition, a.retractTxId = instant, position, tx_id
        newly = []
        for target in plan.erasures:
            # R-ERA-3 (Q49b): the first erasure of a value sets the marker's erasedAt; erasing it
            # again changes nothing; identities, intervals and retirement fields keep their shape
            a = state.assertions[target]
            if a.erasure is None:
                a.erasure = ErasureMark(instant, position, tx_id, state.name)
                newly.append(a)
        meta = command.get("meta") or {}
        if meta.get("commandId") is not None:
            state.claims[meta["commandId"]] = tx_id
        changes = []
        for kind, ref in plan.changes:
            changes.append(("assert", created[ref]) if kind == "assert" else ("retract", target_of(ref)))
        if self.rules["journalChangeOrder"] == "asserts-then-retracts":
            changes = [c for c in changes if c[0] == "assert"] + [c for c in changes if c[0] == "retract"]
        elif self.rules["journalChangeOrder"] == "retracts-then-asserts":
            changes = [c for c in changes if c[0] == "retract"] + [c for c in changes if c[0] == "assert"]
        erasure = any(op.get("op") == "erase" for op in command.get("operations") or [])
        if erasure:
            # R-ERA-5 (Q49a): an erasure commit is an ordinary journaled transaction whose changes
            # list identities only, one per (entity, attribute) in first-erased order, never values
            groups = {}
            for a in newly:
                groups.setdefault((a.entityId, a.attribute), []).append(a.id)
            changes = [("erase", ErasureChange(e, attr, ids)) for (e, attr), ids in groups.items()]
        record = TxRecord(txId=tx_id, position=position, instant=instant, meta=meta, changes=changes,
                          scope=state.name, internal=False, command=command["_index"],
                          group=command.get("physicalGroup"), coordinate=identity.get("coordinate"),
                          erasure=erasure, erased=[a.id for a in newly])
        self._append_record(state, record)
        state.journal.extend(journal_facts(record))
        return record

    def apply_internal(self, state, command, identity):
        record = TxRecord(txId=identity["txId"], position=identity["position"], instant=identity["instant"],
                          meta={}, changes=[], scope=state.name, internal=True, command=command["_index"],
                          group=command.get("physicalGroup"), journaled=command.get("journaled", True),
                          coordinate=identity.get("coordinate"))
        self._append_record(state, record)
        return record

    @staticmethod
    def _append_record(state, record):
        state.records.append(record)
        state.records.sort(key=lambda r: r.position)
        state.last_position = max(state.last_position, record.position)


class ErasureChange:
    """One change of an erasure commit (Q49a): the identities it erased, never values."""

    def __init__(self, entity_id, attribute, ids):
        self.entityId, self.attribute, self.ids = entity_id, attribute, list(ids)


def _value_rejection(error: V.InvalidValue):
    """A value-domain fault as its ACC 4.7 rejection, with the wire guard's detail (Q30a/b)."""
    detail = {"detail": error.detail} if error.detail else {}
    return Rejected(error.error_id, str(error), family=error.family, **detail)


def _fields_of(a: Assertion):
    return {"entityId": a.entityId, "attribute": a.attribute, "entityType": a.entityType, "value": a.value}


def resolve_lane(lane, lane_ranges=None):
    """R-LANE-1: the lane a case is evaluated for. `lane` is an engine (xtdb, qlever), a
    lane id (xtdb-xtql, xtdb-sql, qlever-sparql) or null/core. `lane_ranges` may override
    a range as [low, high] decimal text; every lane must accept at least
    [-(2^53-1), 2^53-1] and stay inside the core integer type (ACC 4.0)."""
    name = lane or "core"
    engine = LANE_ENGINE.get(name, name)
    ranges = dict(LANE_INTEGER_RANGE)
    for key, bounds in (lane_ranges or {}).items():
        low, high = (int(str(b)) for b in bounds)
        if low > -INT53 or high < INT53 or low < V.INT64_MIN or high > V.INT64_MAX:
            raise V.OracleInputError(f"lane {key}: an integer range must contain [-(2^53-1), 2^53-1] "
                                     "and stay inside the core integer type")
        ranges[key] = (low, high)
    if engine not in ranges:
        raise V.OracleInputError(f"unknown lane {name!r}")
    return name, ranges[engine]


def change_output(kind, a: Assertion, record):
    """R-JNL-1 / AMB-05: TransactionChange documented fields plus the testkit-pinned ones
    (assert: value, validFrom, assertionTxId; retract: value, recordedAt, retractedAt,
    retractionTxId, plus assertionTxId of the original assertion). An erasure change (Q49a)
    lists the identities it erased: entity, attribute and assertion ids, never values."""
    if kind == "erase":
        return V.OrderedOut([("op", "erase"), ("entityId", a.entityId), ("attribute", a.attribute),
                             ("assertionIds", list(a.ids))])
    out = [("op", kind), ("tripleId", a.id), ("entityId", a.entityId), ("attribute", a.attribute)]
    if a.entityType is not None:
        out.append(("entityType", a.entityType))
    # AMB-04 (B): the change value is bit-exact (-0.0 stays -0.0), never JSON-normalized; an erased
    # value is its ErasedValue marker (Q31f: the journal compares modulo erasure, R-ERA-1)
    out.append(("value", read_value(a).to_output()))
    out.append(("validFrom", _num(a.validFrom)))
    if a.validTo is not None:
        out.append(("validTo", _num(a.validTo)))
    out.append(("recordedAt", _num(a.recordedAt)))
    out.append(("assertionTxId", a.txId))
    if kind == "retract":
        out.append(("retractedAt", _num(record.instant)))
        out.append(("retractionTxId", record.txId))
    return V.OrderedOut(out)


def changed_entities(record):
    changed = []
    for _, a in record.changes:
        if a.entityId not in changed:
            changed.append(a.entityId)
    return changed


def record_output(record):
    out = [("txId", record.txId), ("position", record.position), ("instant", _num(record.instant))]
    if record.internal:
        out.append(("internal", True))
        out.append(("opaque", "changes of internal writes are not modeled"))
        return V.OrderedOut(out)
    for key in ("actor", "commandId", "correlationId", "causationId", "configSnapshot"):
        if record.meta.get(key) is not None:
            out.append((key, record.meta[key]))
    out.append(("changes", [change_output(kind, a, record) for kind, a in record.changes]))
    out.append(("changedEntities", sorted(changed_entities(record))))
    return V.OrderedOut(out)


def _json_node(node):
    """Expected-output tree -> JsonDoc node (for the :_tx/change json fact value)."""
    if isinstance(node, V.OrderedOut):
        return V.JsonObject([(k, _json_node(v)) for k, v in node])
    if isinstance(node, V.RawNumber):
        return float(node)
    if isinstance(node, list):
        return [_json_node(x) for x in node]
    if isinstance(node, bool) or node is None or isinstance(node, str):
        return node
    if isinstance(node, int):
        return float(node)
    raise TypeError(node)


def journal_facts(record):
    """R-JNL-5 (brief fact 4; C6; operational-primitives 'Causal transaction envelopes'):
    the `_Transaction` entity of a journaled commit carries one `:_tx/changed-entity` ref
    per changed application entity and one `:_tx/change` json fact per change, queryable
    like ordinary facts. Identity: entity id = txId, entity type `_Transaction`, recorded
    at the commit's position and instant. RULING-NEEDED: valid time (taken as
    [commit instant, open), like a write without validFrom, R-CMD-3), fact ids (system
    generated; synthetic here) and the exact json content of `:_tx/change` (the logical
    change content here; compare count and membership). The other envelope facts
    (`:_tx/position`, `:_tx/instant`, `:_tx/actor`, ...) are not modeled (R-JNL-6)."""
    tx = str(record.txId)
    base = dict(scope=record.scope, entityId=tx, entityType=JOURNAL_ENTITY_TYPE, validFrom=record.instant,
                validTo=None, recordedAt=record.instant, recordedPosition=record.position, txId=tx,
                createdBy=None, schemaVersion=None, journal=True, seq=0)
    out = []
    for k, entity in enumerate(changed_entities(record)):
        out.append(Assertion(id=f"journal:{tx}:changed-entity:{k}", attribute=":_tx/changed-entity",
                             value=V.ref(entity), **base))
    for k, (kind, a) in enumerate(record.changes):
        doc = V.JsonDoc(_json_node(change_output(kind, a, record)))
        # `about` links an assert / retract change fact to the assertion it describes, so a read
        # after that value's erasure re-renders the content with the marker (Q49a, read_value)
        about = None if kind == "erase" else (kind, a, record)
        out.append(Assertion(id=f"journal:{tx}:change:{k}", attribute=":_tx/change",
                             value=V.Value("json", doc.canonical, doc), about=about, **base))
    return out
