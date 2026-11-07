"""Graph-constraint enforcement as documented (RULES.md R-CON-*).

docs/configuration.md "Atomic graph constraints": enforcement projects the complete
post-state, checks every represented valid-time boundary (including
future-effective intervals) and rejects only new or worsened violations; existing
violations do not block unrelated writes or repairs. Boundaries are the validFrom
and validTo of every pre-state and post-state fact (orchestrator correction 4,
rule taken from the docstring of Constraint.ts newlyViolated, not its code).
Cardinality counts assertions, not distinct values (PLAN v1.1 C5.1).
"""

from __future__ import annotations

from . import values as V
from .replay import Rejected


def value_identity_text(value: V.Value) -> str:
    out = value.to_output()
    if value.family in ("number", "datetime"):
        return f"{value.family}:{out.get('bits')}"
    if value.family == "json":
        return "json:" + value.payload
    if value.family == "blob":
        return "blob:" + V.dumps(out, indent=0)
    return f"{value.family}:{out.get('value')}"


def _validate_rule(rule):
    tag = rule.get("_tag")
    needed = {"Required": ("entityType", "attribute"), "Cardinality": ("entityType", "attribute", "max"),
              "Unique": ("entityType", "attribute"),
              "ReferenceTarget": ("entityType", "attribute", "targetEntityType")}
    if tag not in needed:
        raise V.OracleInputError(f"unknown constraint rule {tag!r}")
    if str(rule.get("v")) != "1":
        raise V.OracleInputError("constraint rule v must be 1")
    for field in needed[tag]:
        if field not in rule:
            raise V.OracleInputError(f"{tag} rule needs {field}")
    return tag


class Fact:
    __slots__ = ("id", "entityId", "attribute", "value", "entityType", "lo", "hi")

    def __init__(self, id, entityId, attribute, value, entityType, lo, hi):
        self.id, self.entityId, self.attribute, self.value = id, entityId, attribute, value
        self.entityType, self.lo, self.hi = entityType, lo, hi

    def at(self, v):
        return self.lo <= v and (self.hi is None or v < self.hi)


def _facts(state, plan):
    pre = [Fact(a.id, a.entityId, a.attribute, a.value, a.entityType, a.validFrom.frac,
                None if a.validTo is None else a.validTo.frac) for a in state.live()]
    retracted = {target for _, target, _ in plan.retracts}
    post = [f for f in pre if f.id not in retracted]
    for index, fields in plan.asserts:
        post.append(Fact(f"<new:{index}>", fields["entityId"], fields["attribute"], fields["value"],
                         fields["entityType"], fields["validFrom"].frac,
                         None if fields["validTo"] is None else fields["validTo"].frac))
    return pre, post


def violations_at(facts, rules, v, membership="valid-at-instant"):
    """All violations at valid instant v: key -> (actual, detail)."""
    live = [f for f in facts if f.at(v)]
    source = live if membership == "valid-at-instant" else facts
    members = {}
    for f in source:
        if f.entityType is not None:
            members.setdefault(f.entityType, set()).add(f.entityId)
    found = {}
    for rule in rules:
        tag = _validate_rule(rule)
        etype, attr = rule["entityType"], rule["attribute"]
        typed = members.get(etype, set())
        rows = [f for f in live if f.attribute == attr and f.entityId in typed]
        if tag == "Required":
            have = {f.entityId for f in rows}
            for entity in sorted(typed - have):
                found[("required", etype, attr, entity)] = (0, {"subject": entity})
        elif tag == "Cardinality":
            limit = V.Num.parse(rule["max"]).frac if isinstance(rule["max"], V.Lex) else rule["max"]
            counts = {}
            for f in rows:
                counts[f.entityId] = counts.get(f.entityId, 0) + 1
            for entity, count in sorted(counts.items()):
                if count > limit:
                    found[("cardinality", etype, attr, entity)] = (count, {"subject": entity})
        elif tag == "Unique":
            claimants = {}
            for f in rows:
                claimants.setdefault(f.value, set()).add(f.entityId)
            for value, entities in claimants.items():
                if len(entities) > 1:
                    found[("unique", etype, attr, value_identity_text(value))] = (
                        len(entities), {"subject": sorted(entities)[0], "claimants": sorted(entities),
                                        "valueIdentity": value_identity_text(value)})
        elif tag == "ReferenceTarget":
            targets = members.get(rule["targetEntityType"], set())
            for f in rows:
                ok = f.value.family == "ref" and f.value.payload in targets
                if not ok:
                    key = ("reference-target", etype, attr, f.entityId, value_identity_text(f.value))
                    found[key] = (0, {"subject": f.entityId, "valueIdentity": value_identity_text(f.value)})
    return found


def newly_violated(engine, state, plan, rules, instant):
    pre, post = _facts(state, plan)
    boundaries = set()
    for f in pre + post:
        boundaries.add(f.lo)
        if f.hi is not None:
            boundaries.add(f.hi)
    membership = engine.rules["typeMembership"]
    out = []
    for v in sorted(boundaries):
        before = violations_at(pre, rules, v, membership)
        after = violations_at(post, rules, v, membership)
        for key, (actual, detail) in after.items():
            worse = key not in before or (key[0] in ("cardinality", "unique") and actual > before[key][0])
            if worse:
                row = {"code": key[0], "entityType": key[1], "attribute": key[2],
                       "validAt": V.RawNumber(V.es_number_to_string(float(v))), "actual": actual}
                row.update(detail)
                out.append(row)
    return out


__all__ = ["newly_violated", "violations_at", "Rejected", "value_identity_text"]
