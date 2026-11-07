"""Entity models at a basis (RULES.md R-ENT-*), repository get/getMany/find/timeline.

Conflict semantics follow PLAN v1.1 C5 and RULINGS Q8e/Q8f: equal-valued duplicates
are one value with several supports; a cardinality-one attribute with two or more
distinct live values is a conflict and every repository read that references it
fails with ConflictingValuesError; cardinality-many is a set in canonical value
order.
"""

from __future__ import annotations

import functools

from . import exact as X
from . import values as V
from .views import Cut, ordered, resolve_cut, visible

VALUE_TYPES = {"string", "number", "integer", "boolean", "datetime", "ref", "json", "blob"}


def load_schemas(raw_list):
    schemas = {}
    for raw in raw_list or []:
        version = int(raw["version"])
        types = {}
        for tname, tdef in (raw.get("entityTypes") or {}).items():
            props = {}
            for pname, pdef in (tdef.get("attributes") or {}).items():
                card = pdef.get("cardinality", "one")
                if card not in ("one", "many"):
                    raise V.OracleInputError(f"{tname}.{pname}: cardinality must be one or many")
                vtype = pdef.get("type")
                if vtype not in VALUE_TYPES:
                    raise V.OracleInputError(f"{tname}.{pname}: unknown type {vtype!r}")
                props[pname] = {"attribute": pdef["attribute"], "type": vtype, "cardinality": card,
                                "required": bool(pdef.get("required", False)),
                                "unique": bool(pdef.get("unique", False)), "target": pdef.get("target")}
            types[tname] = props
        schemas[version] = types
    return schemas


def schema_rules(schemas, version):
    """R-CON-5: rules a schema release yields (docs/configuration.md: required,
    cardinality, uniqueness, reference-target). Cardinality one -> max 1."""
    rules = []
    for tname, props in sorted(schemas[version].items()):
        for pname, p in props.items():
            base = {"v": 1, "entityType": tname, "attribute": p["attribute"]}
            if p["required"]:
                rules.append(dict(base, _tag="Required"))
            if p["cardinality"] == "one":
                rules.append(dict(base, _tag="Cardinality", max=1))
            if p["unique"]:
                rules.append(dict(base, _tag="Unique"))
            if p["type"] == "ref" and p.get("target"):
                rules.append(dict(base, _tag="ReferenceTarget", targetEntityType=p["target"]))
    return rules


class Conflicts(Exception):
    def __init__(self, items):
        super().__init__("conflict")
        self.items = sorted(set(items))

    def to_output(self):
        return V.OrderedOut([("error", "ConflictingValuesError"), ("conflicts", [
            V.OrderedOut([("entityId", e), ("attribute", a)]) for e, a in self.items])])


class Model:
    """props: name -> ("one", value, supports) | ("many", [(value, supports)]) |
    ("conflict", [(value, supports)]); absent props are missing."""

    def __init__(self, entity_id, etype, props, missing_required, undeclared):
        self.entity_id, self.etype, self.props = entity_id, etype, props
        self.missing_required, self.undeclared = missing_required, undeclared

    def conflicts(self, names=None):
        return [(self.entity_id, self.schema_attr[name]) for name, p in self.props.items()
                if p[0] == "conflict" and (names is None or name in names)]


def _types(run, version):
    if version not in run.schemas:
        raise V.OracleInputError(f"schema version {version} is not declared")
    return run.schemas[version]


def build_model(run, cut, etype, entity_id, version):
    """R-ENT-1: exists iff a visible assertion on the entity carries entityType etype."""
    props_def = _types(run, version).get(etype)
    if props_def is None:
        raise V.OracleInputError(f"entity type {etype} is not in schema {version}")
    facts = [a for a in ordered(run.engine.scope(cut.scope).assertions.values())
             if a.entityId == entity_id and visible(a, cut)]
    if not any(a.entityType == etype for a in facts):
        return None
    props = {}
    declared = {p["attribute"] for p in props_def.values()}
    for name, p in props_def.items():
        groups = {}
        for a in facts:
            if a.attribute == p["attribute"]:
                groups.setdefault(a.value, []).append(a.id)
        if not groups:
            continue
        items = sorted(groups.items(), key=lambda kv: kv[0].order_key())
        if p["cardinality"] == "many":
            props[name] = ("many", items)
        elif len(items) == 1:
            props[name] = ("one", items[0][0], items[0][1])
        else:
            props[name] = ("conflict", items)
    model = Model(entity_id, etype, props,
                  sorted(n for n, p in props_def.items() if p["required"] and n not in props),
                  sorted({a.attribute for a in facts} - declared))
    model.schema_attr = {n: p["attribute"] for n, p in props_def.items()}
    return model


def model_output(model, nested=None):
    props = []
    for name in sorted(model.props):
        p = model.props[name]
        if p[0] == "one":
            props.append((name, V.OrderedOut([("value", p[1].to_output()), ("supports", p[2])])))
        elif p[0] == "many":
            props.append((name, V.OrderedOut([("values", [V.OrderedOut([("value", v.to_output()), ("supports", s)])
                                                          for v, s in p[1]])])))
        else:
            props.append((name, V.OrderedOut([("conflict", [V.OrderedOut([("value", v.to_output()), ("supports", s)])
                                                            for v, s in p[1]])])))
    out = [("entityId", model.entity_id), ("entityType", model.etype), ("properties", V.OrderedOut(props))]
    if nested:
        out.append(("includes", V.OrderedOut(nested)))
    out.append(("missingRequired", model.missing_required))
    out.append(("undeclaredAttributes", model.undeclared))
    return V.OrderedOut(out)


def _resolve_includes(run, cut, model, include, version, conflicts):
    """R-ENT-4: includes resolve at the same basis; conflicts propagate."""
    nested = []
    props_def = _types(run, version)[model.etype]
    for item in include or []:
        if isinstance(item, str):
            p = props_def[item]
            if p["type"] != "ref" or not p.get("target"):
                raise V.OracleInputError(f"include {item} is not a ref with a target type")
            current = model.props.get(item)
            if current is None:
                nested.append((item, None))
                continue
            if current[0] == "conflict":
                conflicts.append((model.entity_id, p["attribute"]))
                continue
            targets = [current[1]] if current[0] == "one" else [v for v, _ in current[1]]
            resolved = []
            for t in targets:
                m = build_model(run, cut, p["target"], t.payload, version)
                if m is not None:
                    conflicts.extend(m.conflicts())
                resolved.append(None if m is None else model_output(m))
            nested.append((item, resolved[0] if current[0] == "one" else resolved))
        else:
            rev = item["reverse"]
            rtype, rprop = rev["type"], rev["prop"]
            rp = _types(run, version)[rtype][rprop]
            ids = sorted({a.entityId for a in run.engine.scope(cut.scope).assertions.values()
                          if visible(a, cut) and a.attribute == rp["attribute"] and a.value.family == "ref"
                          and a.value.payload == model.entity_id})
            models = []
            for rid in ids:
                m = build_model(run, cut, rtype, rid, version)
                if m is None:
                    continue
                conflicts.extend(m.conflicts([rprop]))
                models.append(model_output(m))
            nested.append((rev.get("name", f"{rtype}.{rprop}"), models))
    return nested


def q_get(run, query):
    cut = resolve_cut(run, query.get("cut"))
    version = int(query.get("schemaVersion", 1))
    ids = query["entityIds"] if "entityIds" in query else [query["entityId"]]
    out, conflicts = [], []
    for entity in ids:
        m = build_model(run, cut, query["entityType"], entity, version)
        if m is None:
            out.append(None)
            continue
        conflicts.extend(m.conflicts())
        nested = _resolve_includes(run, cut, m, query.get("include"), version, conflicts)
        out.append(model_output(m, nested))
    if conflicts:
        raise Conflicts(conflicts)
    return out if "entityIds" in query else out[0]


def _cmp_values(a, b, direction):
    """R-ENT-6: present before missing; family rank ascending; direction inside a family."""
    if a is None or b is None:
        return (a is None) - (b is None)
    ka, kb = a.order_key(), b.order_key()
    if ka[0] != kb[0]:
        return -1 if ka[0] < kb[0] else 1
    c = (ka > kb) - (ka < kb)
    return -c if direction == "desc" else c


def q_find(run, query):
    cut = resolve_cut(run, query.get("cut"))
    version = int(query.get("schemaVersion", 1))
    etype = query["entityType"]
    props_def = _types(run, version)[etype]
    mode = query.get("compare", "typed")
    where = query.get("where") or []
    order = query.get("orderBy") or []
    include = query.get("include") or []
    referenced = {c["prop"] for c in where} | {o["prop"] for o in order} | {i for i in include if isinstance(i, str)}
    for name in referenced:
        if name not in props_def:
            raise V.OracleInputError(f"{etype} has no property {name}")
    for o in order:
        if props_def[o["prop"]]["cardinality"] == "many":
            raise X.TypedError("invalid-query", "cannot order by a cardinality-many property", prop=o["prop"])
    ids = sorted({a.entityId for a in run.engine.scope(cut.scope).assertions.values()
                  if visible(a, cut) and a.entityType == etype})
    models = [m for m in (build_model(run, cut, etype, e, version) for e in ids) if m is not None]
    conflicts = [c for m in models for c in m.conflicts(referenced)]
    if conflicts:
        raise Conflicts(conflicts)

    def present(m, name):
        p = m.props.get(name)
        if p is None:
            return []
        return [p[1]] if p[0] == "one" else [v for v, _ in p[1]]

    def keep(m):
        for c in where:
            vals = present(m, c["prop"])
            op = c["op"]
            if op == "exists":
                ok = bool(vals)
            elif op == "missing":
                ok = not vals
            else:
                expected = [V.decode_value(x) for x in c["values"]] if op == "in" else V.decode_value(c["value"])
                ok = any(V.predicate(op, v, expected, mode) for v in vals)
            if not ok:
                return False
        return True

    selected = [m for m in models if keep(m)]

    def compare(m1, m2):
        for o in order:
            v1 = (present(m1, o["prop"]) or [None])[0]
            v2 = (present(m2, o["prop"]) or [None])[0]
            c = _cmp_values(v1, v2, o.get("direction", "asc"))
            if c:
                return c
        return (m1.entity_id > m2.entity_id) - (m1.entity_id < m2.entity_id)

    selected.sort(key=functools.cmp_to_key(compare))
    if query.get("limit") is not None:
        selected = selected[:int(query["limit"])]
    page_size = int(query.get("pageSize", len(selected) or 1))
    pages = []
    for start in range(0, max(len(selected), 1), page_size):
        chunk = selected[start:start + page_size]
        conflicts = []
        bodies = []
        for m in chunk:
            nested = _resolve_includes(run, cut, m, include, version, conflicts)
            bodies.append(model_output(m, nested))
        if conflicts:
            raise Conflicts(conflicts)
        pages.append(V.OrderedOut([("ids", [m.entity_id for m in chunk]), ("entities", bodies),
                                   ("hasMore", start + page_size < len(selected))]))
    return V.OrderedOut([("cut", cut.to_output()), ("total", len(selected)), ("pages", pages)])


def q_timeline(run, query):
    """R-ENT-7 recorded timeline: the model after every journaled position that changed
    the entity, read at (that position, cut R, cut V)."""
    base = resolve_cut(run, query.get("cut"))
    version = int(query.get("schemaVersion", 1))
    entity, etype = query["entityId"], query["entityType"]
    out = []
    for r in run.engine.scope(base.scope).records:
        if r.internal or r.position > base.P or not any(a.entityId == entity for _, a in r.changes):
            continue
        cut = Cut(base.scope, r.position, base.R, base.V)
        m = build_model(run, cut, etype, entity, version)
        entry = [("position", r.position), ("txId", r.txId), ("instant", V.RawNumber(r.instant.lexeme()))]
        if m is not None and m.conflicts():
            entry.append(("model", Conflicts(m.conflicts()).to_output()))
        else:
            entry.append(("model", None if m is None else model_output(m)))
        out.append(V.OrderedOut(entry))
    return out


def q_valid_timeline(run, query):
    """R-ENT-8 valid-time timeline at a recorded cut: half-open segments between the
    validFrom/validTo boundaries of the entity's recorded-visible assertions."""
    from .views import recorded_visible
    base = resolve_cut(run, query.get("cut"), need_valid=False)
    version = int(query.get("schemaVersion", 1))
    entity, etype = query["entityId"], query["entityType"]
    facts = [a for a in run.engine.scope(base.scope).assertions.values()
             if a.entityId == entity and recorded_visible(a, base)]
    bounds = sorted({a.validFrom.frac for a in facts} | {a.validTo.frac for a in facts if a.validTo is not None})
    out = []
    for i, lo in enumerate(bounds):
        hi = bounds[i + 1] if i + 1 < len(bounds) else None
        cut = Cut(base.scope, base.P, base.R, lo)
        m = build_model(run, cut, etype, entity, version)
        seg = [("validFrom", V.RawNumber(V.es_number_to_string(float(lo)))),
               ("validTo", None if hi is None else V.RawNumber(V.es_number_to_string(float(hi))))]
        if m is not None and m.conflicts():
            seg.append(("model", Conflicts(m.conflicts()).to_output()))
        else:
            seg.append(("model", None if m is None else model_output(m)))
        out.append(V.OrderedOut(seg))
    return out
