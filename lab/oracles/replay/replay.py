"""Command-stream replay: expected outcomes, receipt consistency, assertion relation,
journal. RULES.md R-CMD-*, R-RCP-*, R-CON-*, R-JNL-*.

Outcome authority (R-CMD-0): the oracle decides which commands commit from the
captured command intent, stream order, preconditions and enforcement rules.
Receipts only bind system-generated identities (txId, position, instant,
assertion ids) and, inside a declared race group, the serial order the system
chose among the committed members. A receipt outcome that disagrees with the
expected outcome is reported as a mismatch; it never changes the expected state.
"""

from __future__ import annotations

import re
from fractions import Fraction

from . import values as V

NULL_TAGS = None
ERROR_TAGS = {
    "command-already-committed": "CommandAlreadyCommittedError",
    "transaction-conflict": "TransactionConflictError",
    "constraint-violation": "ConstraintViolationError",
    # R-CMD-9: tags for these categories are not documented -> ORCHESTRATOR-RULING-NEEDED
    "invalid-value": None,
    "reserved-namespace": None,
    "invalid-operation": None,
    "host-abort": None,
}

DEFAULT_RULES = {
    # each default below is an ORCHESTRATOR-RULING-NEEDED item in RULES.md
    "retractNonLive": "transaction-conflict",   # R-CMD-5
    "validFromDefault": "transaction-instant",  # R-CMD-3
    "createdByDefault": "null",                 # R-CMD-3 ("null" or "actor")
    "emptyIntervalRejected": True,              # R-CMD-4
    "reservedEntityTypePrefix": "_",            # R-CMD-6
    "reservedAttributePrefix": ":_",            # R-CMD-6
    "attributeSyntax": "any",                   # R-CMD-6 ("any" or "agents-md")
    "retractPatternEmptyRejected": True,        # R-CMD-7
    "typeMembership": "valid-at-instant",       # R-CON-2
    "journalChangeOrder": "operation-order",    # R-JNL-2
    "datetimeRange": None,                      # R-VAL-6 [low, high] lexemes or null
}

_AGENTS_ATTRIBUTE = re.compile(r":[a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*\Z")


class Rejected(Exception):
    def __init__(self, category, message, **detail):
        super().__init__(f"{category}: {message}")
        self.category = category
        self.message = message
        self.detail = detail

    def to_output(self):
        out = [("outcome", "rejected"), ("category", self.category), ("errorTag", ERROR_TAGS.get(self.category))]
        if ERROR_TAGS.get(self.category) is None:
            out.append(("errorTagRuling", "ORCHESTRATOR-RULING-NEEDED"))
        out.append(("message", self.message))
        for key, value in self.detail.items():
            out.append((key, value))
        return V.OrderedOut(out)


# --------------------------------------------------------------------------- relation


class Assertion:
    __slots__ = ("id", "sym", "scope", "entityId", "attribute", "value", "entityType", "createdBy",
                 "validFrom", "validTo", "recordedAt", "recordedPosition", "schemaVersion", "txId",
                 "retractedAt", "retractedPosition", "retractTxId", "seq", "command")

    def __init__(self, **fields):
        for key in self.__slots__:
            setattr(self, key, fields.get(key))

    def live_recorded(self):
        return self.retractedPosition is None

    def valid_at(self, v: Fraction):
        return self.validFrom.frac <= v and (self.validTo is None or v < self.validTo.frac)


def _num(n):
    return None if n is None else V.RawNumber(n.lexeme())


def assertion_output(a: Assertion, *, mask=None):
    """Complete metadata row (spec item 4). ``mask`` = (P, R) applies the as-of
    snapshot retirement mask (spec item 6); None = raw lifetime."""
    retired = a.retractedPosition is not None
    if retired and mask is not None:
        P, R = mask
        retired = a.retractedPosition <= P and (R is None or a.retractedAt.frac <= R)
    return V.OrderedOut([
        ("id", a.id), ("entityId", a.entityId), ("attribute", a.attribute), ("value", a.value.to_output()),
        ("validFrom", _num(a.validFrom)), ("validTo", _num(a.validTo)),
        ("recordedAt", _num(a.recordedAt)), ("recordedPosition", a.recordedPosition),
        ("createdBy", a.createdBy), ("entityType", a.entityType), ("schemaVersion", a.schemaVersion),
        ("txId", a.txId),
        ("retractedAt", _num(a.retractedAt) if retired else None),
        ("retractedPosition", a.retractedPosition if retired else None),
        ("retractTxId", a.retractTxId if retired else None),
    ])


class TxRecord:
    def __init__(self, **fields):
        self.__dict__.update(fields)


class ScopeState:
    def __init__(self, name):
        self.name = name
        self.assertions = {}   # id -> Assertion, insertion order = creation order
        self.claims = {}       # commandId -> txId
        self.records = []      # TxRecord in position order
        self.last_position = 0
        self.seq = 0

    def live(self):
        return [a for a in self.assertions.values() if a.live_recorded()]


# --------------------------------------------------------------------------- planning


class Plan:
    def __init__(self):
        self.asserts = []    # (opIndex, dict of fields)
        self.retracts = []   # (opIndex, assertion id) in op order (pattern expansion inline)
        self.changes = []    # ("assert", opIndex) / ("retract", id) in journal order


def _str_field(raw, name, required=False):
    value = raw.get(name)
    if value is None:
        if required:
            raise Rejected("invalid-operation", f"missing {name}")
        return None
    if not isinstance(value, str) or isinstance(value, V.Lex):
        raise Rejected("invalid-operation", f"{name} must be a string")
    if V.has_lone_surrogate(value):
        raise Rejected("invalid-value", f"{name} contains a lone surrogate")
    return value


class Engine:
    def __init__(self, case_rules=None, adapter=None, schemas=None, enforcement=None, default_scope="default"):
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

    def scope(self, name):
        if name not in self.scopes:
            self.scopes[name] = ScopeState(name)
        return self.scopes[name]

    # ---- validation helpers

    def _check_reserved(self, attribute, entity_type):
        if attribute is not None and attribute.startswith(self.rules["reservedAttributePrefix"]):
            raise Rejected("reserved-namespace", f"attribute {attribute} is reserved")
        if entity_type is not None and entity_type.startswith(self.rules["reservedEntityTypePrefix"]):
            raise Rejected("reserved-namespace", f"entity type {entity_type} is reserved")

    def _resolve_target(self, state, op):
        if "target" in op:
            key = (state.name, op["target"])
            if key not in self.sym_ids:
                raise Rejected("invalid-operation", f"retract target {op['target']} is not a committed assertion")
            return self.sym_ids[key]
        target = _str_field(op, "id", required=True)
        if target not in state.assertions:
            raise Rejected("invalid-operation", f"retract id {target} is unknown in scope {state.name}")
        return target

    def _decode_pattern(self, raw):
        pattern = {}
        for key in ("entityId", "attribute", "entityType"):
            if key in raw:
                pattern[key] = _str_field(raw, key)
        if "value" in raw:
            try:
                pattern["value"] = V.decode_value(raw["value"], datetime_range=self.dt_range)
            except V.InvalidValue as error:
                raise Rejected("invalid-value", str(error))
        unknown = set(raw) - {"entityId", "attribute", "entityType", "value"}
        if unknown:
            raise Rejected("invalid-operation", f"unknown pattern fields {sorted(unknown)}")
        if not pattern and self.rules["retractPatternEmptyRejected"]:
            raise Rejected("invalid-operation", "empty retract pattern")
        self._check_reserved(pattern.get("attribute"), pattern.get("entityType"))
        return pattern

    @staticmethod
    def _matches(a, pattern):
        return all((
            "entityId" not in pattern or a.entityId == pattern["entityId"],
            "attribute" not in pattern or a.attribute == pattern["attribute"],
            "entityType" not in pattern or a.entityType == pattern["entityType"],
            "value" not in pattern or a.value == pattern["value"],
        ))

    def plan(self, state, command, instant):
        """Validate a command against `state` and return a Plan or raise Rejected.

        Precedence (R-CMD-8): operation validation (invalid-value, reserved-namespace,
        invalid-operation) -> command claim -> preconditions -> retract liveness ->
        constraint enforcement.
        """
        plan = Plan()
        operations = command.get("operations")
        if not isinstance(operations, list):
            raise V.OracleInputError("command.operations must be a list")
        meta = command.get("meta") or {}
        retract_ids = []
        for index, op in enumerate(operations):
            kind = op.get("op")
            if kind == "assert":
                fields = self._plan_assert(op, meta, instant)
                plan.asserts.append((index, fields))
                plan.changes.append(("assert", index))
            elif kind == "retract":
                target = self._resolve_target(state, op)
                existing = state.assertions[target]
                self._check_reserved(existing.attribute, existing.entityType)
                if target in retract_ids:
                    raise Rejected("invalid-operation", f"retract {target} appears twice")
                retract_ids.append(target)
                plan.retracts.append((index, target, True))
                plan.changes.append(("retract", target))
            elif kind == "retract-pattern":
                pattern = self._decode_pattern(op.get("pattern") or V.Obj([]))
                matched = [a for a in state.live() if self._matches(a, pattern)]
                matched.sort(key=lambda a: (a.recordedPosition, a.seq))
                for a in matched:
                    if a.id not in retract_ids:
                        retract_ids.append(a.id)
                        plan.retracts.append((index, a.id, False))
                        plan.changes.append(("retract", a.id))
            else:
                raise Rejected("invalid-operation", f"unknown op {kind!r}")
        # command claim (R-CMD-1)
        command_id = meta.get("commandId")
        if command_id is not None and command_id in state.claims:
            raise Rejected("command-already-committed", "command id already committed",
                           commandId=command_id, transactionId=state.claims[command_id])
        # preconditions (R-CMD-2)
        explicit = {target for _, target, is_explicit in plan.retracts if is_explicit}
        for pre in meta.get("preconditions") or []:
            tag = pre.get("_tag")
            if tag == "TripleLive":
                target = self._resolve_target(state, pre)
                if target not in explicit:
                    raise Rejected("invalid-operation", "TripleLive precondition without a matching retract",
                                   tripleId=target)
                if not state.assertions[target].live_recorded():
                    raise Rejected("transaction-conflict", "TripleLive precondition no longer holds", tripleId=target)
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
                    raise Rejected("transaction-conflict", "EntityState precondition no longer holds", entityId=entity)
            else:
                raise Rejected("invalid-operation", f"unknown precondition {tag!r}")
        # retract liveness (R-CMD-5)
        for _, target, is_explicit in plan.retracts:
            if is_explicit and not state.assertions[target].live_recorded():
                if self.rules["retractNonLive"] == "noop":
                    continue
                raise Rejected(self.rules["retractNonLive"], "retract of an assertion that is no longer live",
                               tripleId=target)
        plan.retracts = [(i, t, e) for i, t, e in plan.retracts if state.assertions[t].live_recorded()]
        plan.changes = [c for c in plan.changes if c[0] == "assert" or state.assertions[c[1]].live_recorded()]
        # constraint enforcement (R-CON-*)
        rules = self.rules_for(command)
        if rules:
            from .constraints import newly_violated
            violations = newly_violated(self, state, plan, rules, instant)
            if violations:
                raise Rejected("constraint-violation", "new or worsened constraint violation",
                               codes=sorted({v["code"] for v in violations}),
                               violations=[V.OrderedOut(v.items()) for v in violations])
        return plan

    def _plan_assert(self, op, meta, instant):
        entity_id = _str_field(op, "entityId", required=True)
        if entity_id == "":
            raise Rejected("invalid-operation", "empty entity id")
        attribute = _str_field(op, "attribute", required=True)
        entity_type = _str_field(op, "entityType")
        self._check_reserved(attribute, entity_type)
        if self.rules["attributeSyntax"] == "agents-md" and not _AGENTS_ATTRIBUTE.match(attribute):
            raise Rejected("invalid-operation", f"attribute {attribute} does not match docs/agents.md syntax")
        if "value" not in op:
            raise Rejected("invalid-value", "missing value")
        try:
            value = V.decode_value(op["value"], datetime_range=self.dt_range)
        except V.InvalidValue as error:
            raise Rejected("invalid-value", str(error), family=error.family)
        try:
            valid_from = V.Num.parse(op["validFrom"], "validFrom") if op.get("validFrom") is not None else None
            valid_to = V.Num.parse(op["validTo"], "validTo") if op.get("validTo") is not None else None
        except V.InvalidValue as error:
            raise Rejected("invalid-value", str(error))
        if valid_from is None:
            if self.rules["validFromDefault"] != "transaction-instant":
                raise Rejected("invalid-operation", "validFrom is required by this case's rules")
            valid_from = instant
        if valid_to is not None and self.rules["emptyIntervalRejected"] and valid_to.frac <= valid_from.frac:
            raise Rejected("invalid-operation", "validTo must be after validFrom")
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
        for _, target, _ in plan.retracts:
            a = state.assertions[target]
            a.retractedAt, a.retractedPosition, a.retractTxId = instant, position, tx_id
        meta = command.get("meta") or {}
        if meta.get("commandId") is not None:
            state.claims[meta["commandId"]] = tx_id
        changes = []
        for kind, ref in plan.changes:
            changes.append(("assert", created[ref]) if kind == "assert" else ("retract", state.assertions[ref]))
        if self.rules["journalChangeOrder"] == "asserts-then-retracts":
            changes = [c for c in changes if c[0] == "assert"] + [c for c in changes if c[0] == "retract"]
        elif self.rules["journalChangeOrder"] == "retracts-then-asserts":
            changes = [c for c in changes if c[0] == "retract"] + [c for c in changes if c[0] == "assert"]
        record = TxRecord(txId=tx_id, position=position, instant=instant, meta=meta, changes=changes,
                          scope=state.name, internal=False, command=command["_index"],
                          group=command.get("physicalGroup"))
        self._append_record(state, record)
        return record

    def apply_internal(self, state, command, identity):
        record = TxRecord(txId=identity["txId"], position=identity["position"], instant=identity["instant"],
                          meta={}, changes=[], scope=state.name, internal=True, command=command["_index"],
                          group=command.get("physicalGroup"), journaled=command.get("journaled", True))
        self._append_record(state, record)
        return record

    @staticmethod
    def _append_record(state, record):
        state.records.append(record)
        state.records.sort(key=lambda r: r.position)
        state.last_position = max(state.last_position, record.position)


def change_output(kind, a: Assertion, record):
    """R-JNL-1: TransactionChange shape from packages/core/src/store/Triples.ts."""
    out = [("op", kind), ("tripleId", a.id), ("entityId", a.entityId), ("attribute", a.attribute)]
    if a.entityType is not None:
        out.append(("entityType", a.entityType))
    out.append(("value", a.value.to_output()))
    out.append(("validFrom", _num(a.validFrom)))
    if a.validTo is not None:
        out.append(("validTo", _num(a.validTo)))
    out.append(("recordedAt", _num(a.recordedAt)))
    if kind == "retract":
        out.append(("retractedAt", _num(record.instant)))
        out.append(("assertionTxId", a.txId))
        out.append(("retractionTxId", record.txId))
    return V.OrderedOut(out)


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
    changed = []
    for _, a in record.changes:
        if a.entityId not in changed:
            changed.append(a.entityId)
    out.append(("changedEntities", sorted(changed)))
    return V.OrderedOut(out)
