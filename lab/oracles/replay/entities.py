"""Entity models at a basis (RULES.md R-ENT-*), repository get/getMany/find/count/timeline.

Conflict semantics follow PLAN v1.1 C5 and RULINGS Q8e/Q8f: equal-valued duplicates
are one value with several supports; a cardinality-one attribute with two or more
distinct live values is a conflict and every repository read whose document or query
references it fails with ConflictingValuesError (E-CONFLICTING-VALUES; Q21 AMB-13 and
AMB-17); cardinality-many is a set in canonical value order (ACC 4.5). Value identity
is R-VAL-3 (-0.0 and +0.0 are one value; the representative is the support with the
lowest (recordedPosition, op index), Q14b / AMB-08).
"""

from __future__ import annotations

import functools

from . import exact as X
from . import values as V
from .views import Cut, known, known_retirement, ordered, resolve_cut, visible
from .replay import ErasedValue, _num, erased, read_value

VALUE_TYPES = {"string", "number", "integer", "decimal", "boolean", "datetime", "ref", "json", "blob"}


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
                prop = {"attribute": pdef["attribute"], "type": vtype, "cardinality": card,
                        "required": bool(pdef.get("required", False)),
                        "unique": bool(pdef.get("unique", False)), "target": pdef.get("target")}
                if vtype == "decimal":
                    # Q18: every decimal attribute declares precision and scale
                    if pdef.get("precision") is None or pdef.get("scale") is None:
                        raise V.OracleInputError(f"{tname}.{pname}: a decimal attribute declares precision and scale")
                    prop["decimal"] = V._declaration(pdef["precision"], pdef["scale"], f"{tname}.{pname}")
                props[pname] = prop
            types[tname] = props
        schemas[version] = types
    return schemas


def decimal_declarations(schemas, case_declarations):
    """attribute -> (precision, scale) from the case's attributeDeclarations and every
    schema release (Q18). Two sources that disagree are a case error."""
    out = {}

    def put(attribute, decl, where):
        if attribute in out and out[attribute] != decl:
            # DS-WIDEN / DS-WIDEN-MIGRATE / DS-NARROW (Q22, Q31g, Q35b): a redeclaration is a scale
            # evolution or migration, which the oracle does not model yet; refuse the case
            raise V.OracleInputError(f"X-NOT-MODELED: {where} redeclares decimal {attribute} "
                                     "(scale evolution DS-WIDEN / DS-NARROW is not modeled)")
        out[attribute] = decl
    for attribute, raw in (case_declarations or {}).items():
        if raw.get("type", "decimal") != "decimal":
            continue
        put(attribute, V._declaration(raw.get("precision"), raw.get("scale"), attribute), "attributeDeclarations")
    for version, types in schemas.items():
        for tname, props in types.items():
            for pname, p in props.items():
                if p["type"] == "decimal":
                    put(p["attribute"], p["decimal"], f"schema {version} {tname}.{pname}")
    return out


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
    """E-CONFLICTING-VALUES (PLAN C5.3; AMB-13: compare _tag, reason and the set of
    {entityId, attribute})."""

    def __init__(self, items):
        super().__init__("conflict")
        self.items = sorted(set(items))

    def to_output(self):
        error = X.TypedError("E-CONFLICTING-VALUES", "", conflicts=[
            V.OrderedOut([("entityId", e), ("attribute", a)]) for e, a in self.items])
        return error.to_output()


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
        mine = [a for a in facts if a.attribute == p["attribute"]]
        # R-ERA-6 (Q52e): erased as this read sees it; an in-flight erasure commit is seen whole
        # or not at all, and run.py answers once per choice
        gone = [a for a in mine if erased(a)]
        groups = {}
        for a in mine:             # creation order: the first key of an identity class is Q14b's representative
            if not erased(a):
                groups.setdefault(a.value, []).append(a.id)
        if not groups and not gone:
            continue
        items = sorted(groups.items(), key=lambda kv: kv[0].order_key())
        if gone:
            # Q49c: all erased values of the attribute form one group keyed by the marker, ordered
            # last (Q56d); Q52c: its marker reports the earliest erasedAt
            items.append((ErasedValue(*gone), [a.id for a in gone]))
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


def model_output(model, nested=None, select=None):
    props = []
    for name in sorted(model.props):
        if select is not None and name not in select:
            continue
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
                if isinstance(t, ErasedValue):
                    # Q49c: an erased reference cannot be followed; the include returns the marker
                    resolved.append(t.to_output())
                    continue
                m = build_model(run, cut, p["target"], t.payload, version)
                if m is not None:
                    conflicts.extend(m.conflicts())
                resolved.append(None if m is None else model_output(m))
            nested.append((item, resolved[0] if current[0] == "one" else resolved))
        else:
            rev = item["reverse"]
            rtype, rprop = rev["type"], rev["prop"]
            rp = _types(run, version)[rtype][rprop]
            # Q49c: an erased reference matches no value predicate, so it points nowhere
            ids = sorted({a.entityId for a in run.engine.scope(cut.scope).assertions.values()
                          if visible(a, cut) and a.attribute == rp["attribute"]
                          and not erased(a) and a.value.family == "ref"
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
    """R-ENT-3 (C5.3): get/getMany decode every attribute of the document, so any
    conflicted attribute fails the read with E-CONFLICTING-VALUES listing every
    conflicted (entity, attribute); getMany keeps order and gives null for missing ids."""
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
    """R-ENT-6 (ACC 4.5 family order, Q14a): present before missing; family rank
    ascending; direction inside a family; entity id (codepoint) breaks ties (caller)."""
    if a is None or b is None:
        return (a is None) - (b is None)
    ka, kb = a.order_key(), b.order_key()
    if ka[0] != kb[0]:
        return -1 if ka[0] < kb[0] else 1
    c = (ka > kb) - (ka < kb)
    return -c if direction == "desc" else c


ORDERED_OPS = ("lt", "lte", "gt", "gte")


def _preflight_find(props_def, where):
    """E-MIXED-FAMILY is preflight: a predicate whose declared attribute family and
    constant cannot be compared fails before evaluation, whatever the data: any ordered
    comparison across families (Q33d; CMP-INT-FLOAT, Q14d) and any comparison between
    decimal and integer or number (CMP-DECIMAL-CROSS). An untyped number compares with
    number and datetime, an untyped string with string and ref (CMP-NUMERIC-CONST,
    CMP-UNTYPED-STRING). AMB-16 A: integer range predicates are offered."""
    for c in where:
        if c["op"] in ("exists", "missing"):
            continue
        family = props_def[c["prop"]]["type"]
        raw = c["values"] if c["op"] == "in" else [c["value"]]
        for item in raw:
            constant = V.decode_constant(item)
            op = c["op"]
            if isinstance(constant, V.Value):
                cfam, accepted = constant.family, {constant.family}
            elif constant.kind == "number":
                cfam, accepted = "number", {"number", "datetime"}
            else:
                cfam, accepted = "string", {"string", "ref"}
            pair = {family, cfam}
            if ("decimal" in pair and pair & {"integer", "number"}) or \
                    (op in ORDERED_OPS and family not in accepted):
                raise X.mixed(V.MixedFamily(family, cfam, op))


def _select_and_order(run, query, count_only=False):
    cut = resolve_cut(run, query.get("cut"))
    version = int(query.get("schemaVersion", 1))
    etype = query["entityType"]
    props_def = _types(run, version)[etype]
    mode = query.get("compare", "typed")
    where = query.get("where") or []
    order = [] if count_only else (query.get("orderBy") or [])
    include = [] if count_only else (query.get("include") or [])
    referenced = {c["prop"] for c in where} | {o["prop"] for o in order} | {i for i in include if isinstance(i, str)}
    for name in referenced:
        if name not in props_def:
            raise V.OracleInputError(f"{etype} has no property {name}")
    for o in order:
        if props_def[o["prop"]]["cardinality"] == "many":
            raise X.TypedError("E-INVALID-QUERY", "cannot order by a cardinality-many property", prop=o["prop"])
    _preflight_find(props_def, where)
    ids = sorted({a.entityId for a in run.engine.scope(cut.scope).assertions.values()
                  if visible(a, cut) and a.entityType == etype})
    models = [m for m in (build_model(run, cut, etype, e, version) for e in ids) if m is not None]
    # R-ENT-5 (C5.3): an attribute the query references (where, orderBy, include) that is
    # conflicted for any candidate fails the read; filtering on it would be a false absence
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
                ok = bool(vals)                 # Q49c: an erased value is present with no readable value
            elif op == "missing":
                ok = not vals
            else:
                # Q49c: an erased value matches no value predicate, so it neither selects nor rejects
                vals = [v for v in vals if not isinstance(v, ErasedValue)]
                expected = [V.decode_constant(x) for x in c["values"]] if op == "in" else V.decode_constant(c["value"])
                try:
                    ok = any(V.predicate(op, v, expected, mode) for v in vals)
                except V.MixedFamily as error:
                    raise X.mixed(error)
            if not ok:
                return False
        return True

    selected = [m for m in models if keep(m)]

    def rank(v):
        # Q52b: readable values, then erased markers, then missing values, in both directions
        return 2 if v is None else (1 if isinstance(v, ErasedValue) else 0)

    def compare(m1, m2):
        for o in order:
            v1 = (present(m1, o["prop"]) or [None])[0]
            v2 = (present(m2, o["prop"]) or [None])[0]
            r1, r2 = rank(v1), rank(v2)
            if r1 != r2:
                c = (r1 > r2) - (r1 < r2)
            elif r1 == 1:
                # Q49c / Q52b: erased markers among themselves by assertion id, whatever the direction
                c = (v1.sort_key() > v2.sort_key()) - (v1.sort_key() < v2.sort_key())
            else:
                c = _cmp_values(v1, v2, o.get("direction", "asc"))
            if c:
                return c
        return (m1.entity_id > m2.entity_id) - (m1.entity_id < m2.entity_id)

    selected.sort(key=functools.cmp_to_key(compare))
    return cut, version, props_def, include, selected


def q_count(run, query):
    """Repository.count(where): the number of matching entities. It returns no
    documents, so only the attributes the filter references can fail it (C5.3)."""
    cut, _, _, _, selected = _select_and_order(run, query, count_only=True)
    return V.OrderedOut([("cut", cut.to_output()), ("total", len(selected))])


def q_find(run, query):
    """Repository.find: filter (R-ENT-5), order (R-ENT-6), limit, pages (R-PAGE-1).
    Q21 AMB-17 (A): a returned document decodes every attribute it contains, so the find
    fails with E-CONFLICTING-VALUES when a returned document contains a conflicted
    attribute; `select` (a list of property names) projects the documents, and a
    projection that omits the conflicted attribute succeeds."""
    cut, version, props_def, include, selected = _select_and_order(run, query)
    select = query.get("select")
    if select is not None:
        for name in select:
            if name not in props_def:
                raise V.OracleInputError(f"{query['entityType']} has no property {name}")
        select = set(select)
    if query.get("limit") is not None:
        selected = selected[:int(query["limit"])]
    conflicts = [c for m in selected for c in m.conflicts(select)]
    if conflicts:
        raise Conflicts(conflicts)
    page_size = int(query.get("pageSize", len(selected) or 1))
    pages = []
    for start in range(0, max(len(selected), 1), page_size):
        chunk = selected[start:start + page_size]
        conflicts = []
        bodies = []
        for m in chunk:
            nested = _resolve_includes(run, cut, m, include, version, conflicts)
            bodies.append(model_output(m, nested, select))
        if conflicts:
            raise Conflicts(conflicts)
        pages.append(V.OrderedOut([("ids", [m.entity_id for m in chunk]), ("entities", bodies),
                                   ("hasMore", start + page_size < len(selected))]))
    return V.OrderedOut([("cut", cut.to_output()), ("total", len(selected)), ("pages", pages)])


def q_timeline(run, query):
    """Repository.timeline(entityId, prop) at a basis (R-ENT-7; Q21 AMB-02 and AMB-03).

    AMB-03: lists every assertion of the attribute on the entity recorded at (P, R),
    with no V filter (the V-filtered view is the native known-at-valid helper,
    assertionSnapshot). AMB-02: the compared logical content is {identity, value,
    recordedAt, knownRetirement: null | {retractedAt, retractTxId}}; native rows add
    retractedPosition; validFrom/validTo are listed because the timeline is how intervals
    are seen. Membership and retirement knowledge per R-HIST-2 (as-of snapshot)."""
    cut = resolve_cut(run, query.get("cut"), need_valid=False)
    entity = query["entityId"]
    attribute = query.get("attribute")
    if attribute is None:
        props_def = _types(run, int(query.get("schemaVersion", 1)))[query["entityType"]]
        attribute = props_def[query["prop"]]["attribute"]
    rows = [a for a in ordered(run.engine.scope(cut.scope).assertions.values())
            if a.entityId == entity and a.attribute == attribute and known(a.recordedPosition, a.recordedAt, cut)]
    out = [V.OrderedOut([("identity", a.id), ("value", read_value(a).to_output()), ("recordedAt", _num(a.recordedAt)),
                         ("recordedPosition", a.recordedPosition), ("txId", a.txId),
                         ("validFrom", _num(a.validFrom)), ("validTo", _num(a.validTo)),
                         ("knownRetirement", known_retirement(a, cut))]) for a in rows]
    return V.OrderedOut([("cut", cut.to_output()), ("entityId", entity), ("attribute", attribute),
                         ("assertions", out)])


def q_model_timeline(run, query):
    """R-ENT-8a (the 0.1 `timeline`, renamed): the model after every journaled position
    that changed the entity, read at (that position, cut R, cut V)."""
    base = resolve_cut(run, query.get("cut"))
    version = int(query.get("schemaVersion", 1))
    entity, etype = query["entityId"], query["entityType"]
    out = []      # Q49a: an erasure commit names the entity in its changes, so it is a timeline entry
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
