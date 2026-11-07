"""Read-side expected answers at a cut (RULES.md R-CUT-*, R-HIST-*, R-ENT-*, R-PAGE-*,
R-SUP-*, R-AGG-*). Everything is recomputed from the replayed assertion relation.
"""

from __future__ import annotations

import functools
from fractions import Fraction

from . import exact as X
from . import values as V
from .replay import _num, assertion_output, record_output


# --------------------------------------------------------------------------- cuts


class Cut:
    """(scope, P, optional R, V). R is independent of P (orchestrator correction 1)."""

    def __init__(self, scope, P, R, V_, R_raw=None, V_raw=None):
        self.scope, self.P, self.R, self.V = scope, P, R, V_
        self.R_raw, self.V_raw = R_raw, V_raw

    def to_output(self):
        return V.OrderedOut([("scope", self.scope), ("position", self.P),
                             ("recordedAt", self.R_raw), ("validAt", self.V_raw)])


def resolve_cut(run, raw, *, need_valid=True):
    raw = raw or V.Obj([])
    scope = raw.get("scope") or run.engine.default_scope
    state = run.engine.scope(scope)
    position = raw.get("position", "latest")
    if position == "latest":
        P = state.last_position
    elif isinstance(position, V.Obj) and "afterCommand" in position:
        index = int(position["afterCommand"])
        if index not in run.command_positions:
            raise X.TypedError("unavailable-cut", f"command {index} has no expected position")
        P = run.command_positions[index]
    elif isinstance(position, V.Lex):
        P = int(position)
    else:
        raise V.OracleInputError(f"bad cut position {position!r}")
    if P < 0 or P > state.last_position:
        raise X.TypedError("unavailable-cut", f"position {P} is outside 0..{state.last_position}")
    R = R_raw = None
    if raw.get("recordedAt") is not None:
        n = V.Num.parse(raw["recordedAt"], "recordedAt")
        R, R_raw = n.frac, V.RawNumber(n.lexeme())
    Vf = V_raw = None
    if raw.get("validAt") is not None:
        n = V.Num.parse(raw["validAt"], "validAt")
        Vf, V_raw = n.frac, V.RawNumber(n.lexeme())
    elif need_valid:
        raise V.OracleInputError("cut needs validAt (the oracle has no clock)")
    if raw.get("publicBasis", True):
        for name, value in (("recordedAt", R), ("validAt", Vf)):
            if value is not None and value < 0:
                raise X.TypedError("invalid-basis", f"{name} must be a non-negative instant")
    return Cut(scope, P, R, Vf, R_raw, V_raw)


def known(position, instant, cut):
    """R-CUT-1: an event (arrival or retirement) is known at the cut."""
    return position <= cut.P and (cut.R is None or instant.frac <= cut.R)


def recorded_visible(a, cut):
    if not known(a.recordedPosition, a.recordedAt, cut):
        return False
    return not (a.retractedPosition is not None and known(a.retractedPosition, a.retractedAt, cut))


def visible(a, cut):
    """R-CUT-2: recorded-visible at (P, R) and valid at V under [validFrom, validTo)."""
    return recorded_visible(a, cut) and a.valid_at(cut.V)


def ordered(assertions):
    return sorted(assertions, key=lambda a: (a.recordedPosition, a.seq))


def scope_assertions(run, cut):
    return list(run.engine.scope(cut.scope).assertions.values())


# --------------------------------------------------------------------------- triple reads


def _pattern_match(a, pattern):
    return all((
        "entityId" not in pattern or a.entityId == pattern["entityId"],
        "attribute" not in pattern or a.attribute == pattern["attribute"],
        "entityType" not in pattern or a.entityType == pattern["entityType"],
        "value" not in pattern or a.value == pattern["value"],
    ))


def _decode_pattern(raw):
    pattern = {}
    for key in ("entityId", "attribute", "entityType"):
        if raw.get(key) is not None:
            pattern[key] = raw[key]
    if raw.get("value") is not None:
        pattern["value"] = V.decode_value(raw["value"])
    return pattern


def q_match(run, query):
    """Visible assertions for a pattern at a cut, in both history contracts."""
    cut = resolve_cut(run, query.get("cut"))
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    rows = [a for a in ordered(scope_assertions(run, cut)) if visible(a, cut) and _pattern_match(a, pattern)]
    return V.OrderedOut([("cut", cut.to_output()), ("count", len(rows)),
                         ("raw", [assertion_output(a) for a in rows]),
                         ("snapshot", [assertion_output(a, mask=(cut.P, cut.R)) for a in rows])])


def q_entity_triples(run, query):
    cut = resolve_cut(run, query.get("cut"))
    entity = query["entityId"]
    rows = [a for a in ordered(scope_assertions(run, cut)) if a.entityId == entity and visible(a, cut)]
    return V.OrderedOut([("cut", cut.to_output()), ("entityId", entity),
                         ("raw", [assertion_output(a) for a in rows]),
                         ("snapshot", [assertion_output(a, mask=(cut.P, cut.R)) for a in rows])])


def q_history(run, query):
    """R-HIST-1/2: raw lifetime keeps complete retirement fields; the as-of snapshot
    masks retirement unless retractedPosition <= P and (R unbound or retractedAt <= R).
    Membership: assertions whose arrival is known at the cut (all, when no cut)."""
    raw_cut = query.get("cut")
    cut = resolve_cut(run, raw_cut, need_valid=False) if raw_cut is not None else None
    if cut is None:
        state = run.engine.scope(run.engine.default_scope if query.get("scope") is None else query["scope"])
        cut = Cut(state.name, state.last_position, None, None)
    entity = query["entityId"]
    rows = [a for a in ordered(scope_assertions(run, cut))
            if a.entityId == entity and known(a.recordedPosition, a.recordedAt, cut)]
    if cut.V is not None and query.get("applyValidAt", False):
        rows = [a for a in rows if a.valid_at(cut.V)]
    return V.OrderedOut([("cut", cut.to_output()), ("entityId", entity),
                         ("rawLifetime", [assertion_output(a) for a in rows]),
                         ("asOfSnapshot", [assertion_output(a, mask=(cut.P, cut.R)) for a in rows])])


def q_assertion_snapshot(run, query):
    """The O-HAM SnapshotAssertion target (historical-assertion-metadata v1/v2 MENU).

    live-at-valid: visible at (P, R, V). known-at-valid: arrival known and valid at V,
    retired or not, with knownRetirement only when the retirement is known."""
    cut = resolve_cut(run, query.get("cut"))
    mode = query.get("mode", "live-at-valid")
    if mode not in ("live-at-valid", "known-at-valid"):
        raise V.OracleInputError("mode must be live-at-valid or known-at-valid")
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    out = []
    for a in ordered(scope_assertions(run, cut)):
        if not _pattern_match(a, pattern) or not known(a.recordedPosition, a.recordedAt, cut) or not a.valid_at(cut.V):
            continue
        retired_known = a.retractedPosition is not None and known(a.retractedPosition, a.retractedAt, cut)
        if mode == "live-at-valid" and retired_known:
            continue
        out.append(V.OrderedOut([
            ("id", a.id), ("entityId", a.entityId), ("attribute", a.attribute), ("value", a.value.to_output()),
            ("entityType", a.entityType), ("validFrom", _num(a.validFrom)), ("validTo", _num(a.validTo)),
            ("createdBy", a.createdBy), ("schemaVersion", a.schemaVersion), ("recordedAt", _num(a.recordedAt)),
            ("txId", a.txId),
            ("knownRetirement", V.OrderedOut([("recordedAt", _num(a.retractedAt)), ("txId", a.retractTxId)])
             if retired_known else None)]))
    return V.OrderedOut([("cut", cut.to_output()), ("mode", mode), ("assertions", out)])


def q_assertions(run, query):
    scope = query.get("scope") or run.engine.default_scope
    rows = ordered(run.engine.scope(scope).assertions.values())
    return V.OrderedOut([("scope", scope), ("assertions", [assertion_output(a) for a in rows])])


# --------------------------------------------------------------------------- journal


def _journal(run, scope):
    return [r for r in run.engine.scope(scope).records if getattr(r, "journaled", True)]


def _limit(raw, default=100, maximum=1000):
    if raw is None:
        return default
    value = int(raw)
    if value < 1 or value > maximum:
        raise X.TypedError("ReadError", f"limit must be 1..{maximum}")
    return value


def q_transactions(run, query):
    """transactions({after, limit}): position > after, ascending (R-JNL-3)."""
    scope = query.get("scope") or run.engine.default_scope
    after = int(query.get("after", V.Lex("0")))
    limit = _limit(query.get("limit"))
    rows = [r for r in _journal(run, scope) if r.position > after][:limit]
    out = [("transactions", [record_output(r) for r in rows])]
    if rows:
        out.append(("next", rows[-1].position))
    return V.OrderedOut(out)


def q_transaction(run, query):
    scope = query.get("scope") or run.engine.default_scope
    for r in _journal(run, scope):
        if r.txId == query["txId"]:
            return record_output(r)
    return None


def q_transaction_by_command(run, query):
    scope = query.get("scope") or run.engine.default_scope
    for r in _journal(run, scope):
        if not r.internal and r.meta.get("commandId") == query["commandId"]:
            return record_output(r)
    return None


def q_transactions_for_entity(run, query):
    """Newest first; first page captures snapshotPosition; continuation is exclusive."""
    scope = query.get("scope") or run.engine.default_scope
    entity = query["entityId"]
    limit = _limit(query.get("limit"))
    snapshot = int(query["snapshotPosition"]) if query.get("snapshotPosition") is not None \
        else run.engine.scope(scope).last_position
    before = int(query["beforePosition"]) if query.get("beforePosition") is not None else None
    rows = [r for r in _journal(run, scope) if not r.internal and r.position <= snapshot
            and (before is None or r.position < before)
            and any(a.entityId == entity for _, a in r.changes)]
    rows.sort(key=lambda r: -r.position)
    page = rows[:limit]
    out = [("transactions", [record_output(r) for r in page]), ("snapshotPosition", snapshot)]
    if len(rows) > limit:
        out.append(("nextBeforePosition", page[-1].position))
    return V.OrderedOut(out)


def q_cut_catalog(run, query):
    scope = query.get("scope") or run.engine.default_scope
    return [V.OrderedOut([("position", r.position), ("instant", _num(r.instant)), ("txId", r.txId),
                          ("command", r.command), ("internal", r.internal), ("physicalGroup", r.group)])
            for r in run.engine.scope(scope).records]


# --------------------------------------------------------------------------- entity pages (core)


def q_entity_page(run, query):
    """entityPage: ids with a visible assertion carrying entityType, ordered by entity id
    in codepoint order (R-PAGE-2); bodies are all visible triples of the entity."""
    cut = resolve_cut(run, query.get("cut"))
    etype = query["entityType"]
    limit = _limit(query.get("limit"))
    rows = [a for a in scope_assertions(run, cut) if visible(a, cut)]
    ids = sorted({a.entityId for a in rows if a.entityType == etype})
    pages = []
    for start in range(0, max(len(ids), 1), limit):
        chunk = ids[start:start + limit]
        bodies = []
        for entity in chunk:
            body = sorted((a for a in rows if a.entityId == entity), key=lambda a: a.id)
            bodies.append(V.OrderedOut([("entityId", entity), ("bodyOrder", "set (sorted by id here)"),
                                        ("triples", [assertion_output(a) for a in body])]))
        pages.append(V.OrderedOut([("entities", bodies), ("hasMore", start + limit < len(ids))]))
    return V.OrderedOut([("cut", cut.to_output()), ("pageSize", limit), ("pages", pages)])


# --------------------------------------------------------------------------- supports


def q_value_supports(run, query):
    """R-SUP-1: per (entity, attribute, value) the live supporting assertions."""
    cut = resolve_cut(run, query.get("cut"))
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    groups = {}
    for a in ordered(scope_assertions(run, cut)):
        if visible(a, cut) and _pattern_match(a, pattern):
            groups.setdefault((a.entityId, a.attribute, a.value), []).append(a.id)
    keys = sorted(groups, key=lambda k: (k[0], k[1], k[2].order_key()))
    return V.OrderedOut([("cut", cut.to_output()), ("supports", [
        V.OrderedOut([("entityId", k[0]), ("attribute", k[1]), ("value", k[2].to_output()),
                      ("count", len(groups[k])), ("assertionIds", groups[k])]) for k in keys])])


def q_reachability(run, query):
    """R-SUP-2: edges are visible values (ref or string) of one attribute at the cut.

    closure = positive-length reachable set; supports = number of distinct
    node-sequence paths from -> to (DAG only; a cycle on a path is a typed error),
    each path listed with the assertion ids of its edges."""
    cut = resolve_cut(run, query.get("cut"))
    attribute = query["attribute"]
    edges = {}
    for a in ordered(scope_assertions(run, cut)):
        if a.attribute == attribute and visible(a, cut) and a.value.family in ("ref", "string"):
            edges.setdefault(a.entityId, {}).setdefault(a.value.payload, []).append(a.id)
    origin = query["from"]
    seen, pending = set(), list(edges.get(origin, {}))
    while pending:
        node = pending.pop()
        if node not in seen:
            seen.add(node)
            pending.extend(edges.get(node, {}))
    out = [("cut", cut.to_output()), ("closure", sorted(seen))]
    target = query.get("to")
    if target is not None:
        paths = []

        def walk(node, trail, ids):
            for nxt in sorted(edges.get(node, {})):
                if nxt in trail:
                    raise X.TypedError("cycle", "support counting requires an acyclic path set", node=nxt)
                for support in edges[node][nxt]:
                    if nxt == target:
                        paths.append((trail + [nxt], ids + [support]))
                    else:
                        walk(nxt, trail + [nxt], ids + [support])
        walk(origin, [origin], [])
        # distinct node sequences (several equal-valued edge assertions are one edge)
        sequences = {}
        for nodes, ids in paths:
            sequences.setdefault(tuple(nodes), []).append(ids)
        out += [("reachable", bool(sequences)), ("supportCount", len(sequences)),
                ("paths", [V.OrderedOut([("nodes", list(k)), ("edgeAssertionIds", v)])
                           for k, v in sorted(sequences.items())])]
    return V.OrderedOut(out)


# --------------------------------------------------------------------------- aggregates


def _rows(run, cut, match):
    """Datalog-like rows: one row per entity and per combination of distinct visible
    values of the named attributes (set semantics, R-AGG-0)."""
    names = list(match["attributes"].keys())
    etype = match.get("entityType")
    by_entity = {}
    for a in scope_assertions(run, cut):
        if visible(a, cut):
            by_entity.setdefault(a.entityId, []).append(a)
    rows = []
    for entity in sorted(by_entity):
        facts = by_entity[entity]
        if etype is not None and not any(a.entityType == etype for a in facts):
            continue
        choices = []
        for name in names:
            attr = match["attributes"][name]
            vals = sorted({a.value for a in facts if a.attribute == attr}, key=lambda v: v.order_key())
            choices.append(vals)
        if any(not c for c in choices):
            continue
        combos = [[]]
        for c in choices:
            combos = [prev + [v] for prev in combos for v in c]
        for combo in combos:
            row = {"$entity": V.ref(entity)}
            row.update(zip(names, combo))
            rows.append(row)
    return rows


def q_aggregate(run, query):
    cut = resolve_cut(run, query.get("cut"))
    rows = _rows(run, cut, query["match"])
    for cond in query.get("where") or []:
        expected = [V.decode_value(x) for x in cond["values"]] if cond["op"] == "in" else V.decode_value(cond["value"])
        rows = [r for r in rows if V.predicate(cond["op"], r[cond["var"]], expected, query.get("compare", "typed"))]
    group_by = list(query.get("groupBy") or [])
    aggs = query["aggregates"]
    groups = {}
    for r in rows:
        groups.setdefault(tuple(r[g] for g in group_by), []).append(r)
    options = {"integerAvg": query.get("integerAvg", "preflight-error")}
    # preflight (R-AGG-4): integer AVG is refused before evaluation
    for agg in aggs:
        if agg["op"] == "avg" and options["integerAvg"] == "preflight-error":
            declared = query.get("varTypes", {}).get(agg["var"])
            if declared == "integer" or any(r[agg["var"]].family == "integer" for r in rows):
                raise X.TypedError("DatalogValidationError",
                                   "Exact integer AVG requires an explicit conversion to number")
    if not group_by and not groups:
        groups[()] = []
    out_rows = []
    for key in sorted(groups, key=lambda k: [v.order_key() for v in k]):
        members = groups[key]
        row = [(g, v.to_output()) for g, v in zip(group_by, key)]
        for agg in aggs:
            if agg["op"] == "count":
                items = [r[agg["var"]] for r in members]
            else:
                items = [r[agg["var"]] for r in members]
            result = X.aggregate(agg["op"], items, **options)
            if result is None and query.get("emptyAs") is not None:
                result = V.decode_value(query["emptyAs"])
            row.append((agg.get("as", agg["op"]), None if result is None else result.to_output()))
        out_rows.append(V.OrderedOut(row))
    return V.OrderedOut([("cut", cut.to_output()), ("rows", out_rows)])


def q_expr(run, query):
    def decode(node):
        if isinstance(node, list):
            return [node[0]] + [decode(x) for x in node[1:]]
        return V.decode_value(node)
    return X.evaluate(decode(query["expr"])).to_output()


def q_compare(run, query):
    """Equality / order between two values under the case's comparison mode."""
    a, b = V.decode_value(query["left"]), V.decode_value(query["right"])
    mode = query.get("compare", "typed")
    out = [("comparable", V.comparable(a, b, mode)), ("identical", a == b)]
    for op in ("eq", "ne", "lt", "gt"):
        out.append((op, V.predicate(op, a, b, mode)))
    out.append(("sameGroup", a == b))
    return V.OrderedOut(out)


def q_sort_values(run, query):
    vals = [V.decode_value(x) for x in query["values"]]
    distinct = sorted(set(vals), key=lambda v: v.order_key())
    return [v.to_output() for v in distinct]
