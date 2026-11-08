"""Read-side expected answers at a cut (RULES.md R-CUT-*, R-HIST-*, R-PAGE-*, R-SUP-*,
R-AGG-*, R-JNL-*). Everything is recomputed from the replayed assertion relation.
"""

from __future__ import annotations

import base64
import hashlib
import json

from . import exact as X
from . import replay as RP
from . import values as V
from .replay import ErasedValue, _num, assertion_output, is_erased, read_value, record_output, value_matches


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
            raise X.TypedError("X-NO-POSITION", f"command {index} has no expected position (it is not committed)",
                               ruling="case references the position of a command the oracle rejects")
        P = run.command_positions[index]
    elif isinstance(position, V.Obj) and "coordinate" in position:
        # RULINGS Q31c: a cut named by a (stream, epoch, offset, ordinal) coordinate resolves to
        # the oracle's dense ordinal of the greatest committed position at or below it, so a
        # cut inside an abort gap equals the cut just before the gap (FX-ABORT-GAP)
        P = run.ordinal_at(scope, position["coordinate"])
    elif isinstance(position, V.Lex):
        P = int(position)
    else:
        raise V.OracleInputError(f"bad cut position {position!r}")
    if P > state.last_position:
        # ACC 4.7 E-UNAVAILABLE-CUT: permitted only for a basis beyond the latest committed position
        raise X.TypedError("E-UNAVAILABLE-CUT", f"position {P} is beyond the latest committed position "
                           f"{state.last_position}")
    if P < 0:
        # R-CUT-3 (ruled by Q33h): an invalid basis is E-INVALID-VALUE
        raise X.TypedError("E-INVALID-VALUE", f"position {P} is negative")
    R = R_raw = None
    numbers = {}
    if raw.get("recordedAt") is not None:
        n = numbers["recordedAt"] = V.Num.parse(raw["recordedAt"], "recordedAt")
        R, R_raw = n.frac, V.RawNumber(n.lexeme())
    Vf = V_raw = None
    if raw.get("validAt") is not None:
        n = numbers["validAt"] = V.Num.parse(raw["validAt"], "validAt")
        Vf, V_raw = n.frac, V.RawNumber(n.lexeme())
    elif need_valid:
        raise V.OracleInputError("cut needs validAt (the oracle has no clock)")
    if raw.get("publicBasis", True):
        for name, n in numbers.items():
            if n.frac < 0:
                raise X.TypedError("E-INVALID-VALUE", f"{name} must be a non-negative instant")   # Q33h
            if n.bits == V.NEG_ZERO_BITS:
                # R-CUT-4 (RULINGS Q43h, consistent with Q30b): a read basis given as -0 is
                # E-NEGATIVE-ZERO-INSTANT, never the instant 0
                raise X.TypedError("E-NEGATIVE-ZERO-INSTANT", f"{name} given as -0", detail="no-negative-zero")
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
    """Creation order (recordedPosition, operation index): AMB-07, and the Q14b
    representative order for supports that differ only in representation."""
    return sorted(assertions, key=lambda a: (a.recordedPosition, a.seq))


def scope_assertions(run, cut):
    return list(run.engine.scope(cut.scope).assertions.values())


# --------------------------------------------------------------------------- journal facts as facts


def journal_selection(run, scope, pattern):
    """R-JNL-5 / R-JNL-6: which journal facts a fact pattern reads.

    'exclude': the pattern does not name the journal (no :_tx/ attribute, no
      _Transaction type, no transaction entity id); the application relation answers.
    'include': the pattern names :_tx/change or :_tx/changed-entity (brief fact 4).
    Raises X-NOT-MODELED when the pattern could also select envelope facts the oracle
    does not model (other :_tx/ attributes, or a transaction entity without an
    attribute), instead of returning a partial answer."""
    state = run.engine.scope(scope)
    attribute, entity, etype = pattern.get("attribute"), pattern.get("entityId"), pattern.get("entityType")
    names = (attribute is not None and attribute.startswith(":_tx/")) or etype == RP.JOURNAL_ENTITY_TYPE \
        or (entity is not None and entity in state.tx_ids())
    if not names:
        return "exclude"
    if attribute in RP.JOURNAL_ATTRIBUTES:
        return "include"
    raise X.TypedError("X-NOT-MODELED", "the pattern selects transaction envelope facts other than "
                       ":_tx/change and :_tx/changed-entity", ruling="R-JNL-6: envelope fact families and "
                       "presence are not frozen (ORCHESTRATOR-RULING-NEEDED)")


def fact_source(run, cut, pattern):
    rows = scope_assertions(run, cut)
    if journal_selection(run, cut.scope, pattern) == "include":
        rows = rows + list(run.engine.scope(cut.scope).journal)
    return rows


# --------------------------------------------------------------------------- triple reads


def _pattern_match(a, pattern):
    return all((
        "entityId" not in pattern or a.entityId == pattern["entityId"],
        "attribute" not in pattern or a.attribute == pattern["attribute"],
        "entityType" not in pattern or a.entityType == pattern["entityType"],
        "value" not in pattern or value_matches(a, pattern["value"]),   # Q49c: an erased value matches none
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
    """Visible assertions for a pattern at a cut. Q21 AMB-01 (A): ordinary match keeps
    the raw lifetime at an explicit R (no global mask), so `raw` is the match contract;
    `snapshot` is the as-of view of the same rows, kept for the repository as-of reads,
    timeline and native history helpers that use it."""
    cut = resolve_cut(run, query.get("cut"))
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    rows = [a for a in ordered(fact_source(run, cut, pattern)) if visible(a, cut) and _pattern_match(a, pattern)]
    return V.OrderedOut([("cut", cut.to_output()), ("count", len(rows)), ("contract", "raw-lifetime (AMB-01 A)"),
                         ("raw", [assertion_output(a) for a in rows]),
                         ("snapshot", [assertion_output(a, mask=(cut.P, cut.R)) for a in rows])])


def q_entity_triples(run, query):
    """Triples.entity at a cut: every visible assertion of the entity (AMB-01 A: raw)."""
    cut = resolve_cut(run, query.get("cut"))
    entity = query["entityId"]
    pattern = {"entityId": entity}
    rows = [a for a in ordered(fact_source(run, cut, pattern)) if a.entityId == entity and visible(a, cut)]
    return V.OrderedOut([("cut", cut.to_output()), ("entityId", entity), ("contract", "raw-lifetime (AMB-01 A)"),
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


def known_retirement(a, cut):
    """Q21 AMB-02: logical retirement content {retractedAt, retractTxId}; native rows add
    retractedPosition. Null unless the retirement is known at (P, R) (R-HIST-2)."""
    if a.retractedPosition is None or not known(a.retractedPosition, a.retractedAt, cut):
        return None
    return V.OrderedOut([("retractedAt", _num(a.retractedAt)), ("retractTxId", a.retractTxId),
                         ("retractedPosition", a.retractedPosition)])


def q_assertion_snapshot(run, query):
    """The O-HAM SnapshotAssertion target (historical-assertion-metadata v1/v2 MENU), the
    V-filtered native known-at-valid helper of AMB-03.

    live-at-valid: visible at (P, R, V). known-at-valid: arrival known and valid at V,
    retired or not, with knownRetirement (AMB-02 names) only when the retirement is known."""
    cut = resolve_cut(run, query.get("cut"))
    mode = query.get("mode", "live-at-valid")
    if mode not in ("live-at-valid", "known-at-valid"):
        raise V.OracleInputError("mode must be live-at-valid or known-at-valid")
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    out = []
    for a in ordered(scope_assertions(run, cut)):
        if not _pattern_match(a, pattern) or not known(a.recordedPosition, a.recordedAt, cut) or not a.valid_at(cut.V):
            continue
        retirement = known_retirement(a, cut)
        if mode == "live-at-valid" and retirement is not None:
            continue
        out.append(V.OrderedOut([
            ("id", a.id), ("entityId", a.entityId), ("attribute", a.attribute), ("value", read_value(a).to_output()),
            ("entityType", a.entityType), ("validFrom", _num(a.validFrom)), ("validTo", _num(a.validTo)),
            ("createdBy", a.createdBy), ("schemaVersion", a.schemaVersion), ("recordedAt", _num(a.recordedAt)),
            ("txId", a.txId), ("knownRetirement", retirement)]))
    return V.OrderedOut([("cut", cut.to_output()), ("mode", mode), ("assertions", out)])


def q_assertions(run, query):
    """The complete application assertion relation (spec item 4), raw lifetime. Journal
    facts are a separate relation (journalFacts query), not application assertions."""
    scope = query.get("scope") or run.engine.default_scope
    rows = ordered(run.engine.scope(scope).assertions.values())
    return V.OrderedOut([("scope", scope), ("assertions", [assertion_output(a) for a in rows])])


def q_journal_facts(run, query):
    """R-JNL-5: the modeled journal facts of a scope (or of one transaction)."""
    scope = query.get("scope") or run.engine.default_scope
    rows = [a for a in run.engine.scope(scope).journal if query.get("txId") is None or a.txId == query["txId"]]
    return V.OrderedOut([("scope", scope), ("facts", [assertion_output(a) for a in rows])])


# --------------------------------------------------------------------------- journal


def _journal(run, scope):
    return [r for r in run.engine.scope(scope).records if getattr(r, "journaled", True)]


def _limit(raw, default=100, maximum=1000):
    """R-JNL-3: limit 1..maximum (default 100, maximum 1000)."""
    if raw is None:
        return default
    try:
        value = int(str(raw)) if not isinstance(raw, bool) else None
    except ValueError:
        value = None
    if value is None or value < 1 or value > maximum:
        # R-JNL-7 (ruled by Q33g): an invalid limit is PaginationCursorError / malformed, as entityPage
        raise X.TypedError("E-CURSOR", f"limit must be 1..{maximum}", reason="malformed")
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
    # Q49a: an erasure commit's identity changes name the entity, so it is listed like any change
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

    def row(r):
        fields = [("position", r.position), ("instant", _num(r.instant)), ("txId", r.txId),
                  ("command", r.command), ("internal", r.internal), ("physicalGroup", r.group)]
        # RULINGS Q31c: `position` is the oracle's dense ordinal; a receipt coordinate is shown
        # beside it so a harness can map its own coordinates onto the oracle's cuts
        if isinstance(getattr(r, "coordinate", None), V.OrderedOut):
            fields.append(("coordinate", r.coordinate))
        if getattr(r, "erasure", False):
            fields.append(("erasure", True))      # R-ERA-2: an erasure commit takes a position like any commit
        return V.OrderedOut(fields)
    return [row(r) for r in run.engine.scope(scope).records]


# --------------------------------------------------------------------------- entity pages (core) and cursors

PAGE_LIMIT_MIN, PAGE_LIMIT_MAX, PAGE_LIMIT_DEFAULT = 1, 200, 50   # brief fact 3
CURSOR_PREFIX = "o-replay-cursor/1:"


def _cursor_error(reason, message):
    """ACC 4.7 E-CURSOR (PaginationCursorError) with one of CURSOR_TRANSITIONS.permittedErrors."""
    return X.TypedError("E-CURSOR", message, reason=reason)


def encode_cursor(body):
    """Oracle cursor token: the pinned basis and the last returned entity id, with a digest
    so an altered token is detected (CE-MALFORMED). Tokens are oracle-internal: a harness
    compares page sequences, never token bytes."""
    text = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    digest = hashlib.sha256(text.encode()).hexdigest()[:16]
    return CURSOR_PREFIX + base64.urlsafe_b64encode(text.encode()).decode() + "." + digest


def decode_cursor(token):
    try:
        if not isinstance(token, str) or not token.startswith(CURSOR_PREFIX):
            raise ValueError("prefix")
        payload, digest = token[len(CURSOR_PREFIX):].rsplit(".", 1)
        text = base64.urlsafe_b64decode(payload.encode()).decode()
        if hashlib.sha256(text.encode()).hexdigest()[:16] != digest:
            raise ValueError("digest")
        body = json.loads(text)
        for key in ("scope", "entityType", "P", "R", "V", "after"):
            if key not in body:
                raise ValueError(key)
        return body
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        raise _cursor_error("malformed", "the cursor token was altered or is not a token (CE-MALFORMED)")


def _page_limit(raw):
    """Brief fact 3: entityPage limit is an integer 1..200, default 50; out of range is a
    typed error. R-PAGE-3 (RULING-NEEDED): the tag follows golden G10-CUR-01 E3
    (PaginationCursorError / malformed); ACC 4.7 E-CURSOR names only token faults."""
    if raw is None:
        return PAGE_LIMIT_DEFAULT
    text = str(raw)
    if isinstance(raw, bool) or not text.lstrip("-").isdigit() or not PAGE_LIMIT_MIN <= int(text) <= PAGE_LIMIT_MAX:
        raise _cursor_error("malformed", f"entityPage limit must be an integer {PAGE_LIMIT_MIN}..{PAGE_LIMIT_MAX}")
    return int(text)


def q_entity_page(run, query):
    """entityPage: ids with a visible assertion carrying entityType, ordered by entity id
    in codepoint order (R-PAGE-2, AMB-15); bodies are all visible triples of the entity in
    the raw-lifetime contract (AMB-01 A). Every page of one sequence reads the one cut the
    first page captured (G10.cursor.stable).

    Continuation: `cursorFrom: {query, page}` names the nextCursor of an earlier query's
    page (or `cursor` gives a token text). CURSOR_TRANSITIONS.permittedErrors: an altered
    token is E-CURSOR/malformed, another scope other-scope, another query definition
    (entity type, or an explicitly given basis that differs from the pinned one)
    other-query (R-PAGE-4: golden G10-CUR-01 E1/E2 name the reasons basis_mismatch and
    query_mismatch, which are not ACC 4.7 reasons; the contract wins)."""
    etype = query["entityType"]
    limit = _page_limit(query.get("limit"))
    token = query.get("cursor")
    if query.get("cursorFrom") is not None:
        ref = query["cursorFrom"]
        prior = run.results.get(ref["query"])
        if prior is None:
            raise V.OracleInputError(f"cursorFrom names unknown or failed query {ref['query']!r}")
        token = prior.get("pages")[int(ref.get("page", 0))].get("nextCursor")
        if token is None:
            raise V.OracleInputError(f"query {ref['query']!r} page {ref.get('page', 0)} has no nextCursor")
    after = None
    if token is not None:
        body = decode_cursor(token)
        scope = (query.get("cut") or {}).get("scope") or run.engine.default_scope
        if body["scope"] != scope:
            raise _cursor_error("other-scope", "the cursor belongs to another scope (CE-OTHER-SCOPE)")
        if body["entityType"] != etype:
            raise _cursor_error("other-query", "the cursor belongs to another query (CE-OTHER-QUERY)")
        given = query.get("cut") or V.Obj([])
        pinned = {"recordedAt": body["R"], "validAt": body["V"]}
        for key, value in pinned.items():
            if given.get(key) is not None and V.Num.parse(given[key], key).lexeme() != value:
                raise _cursor_error("other-query", f"the request's {key} differs from the cursor's pinned basis "
                                    "(CE-OTHER-QUERY)")
        if isinstance(given.get("position"), V.Lex) and int(given["position"]) != body["P"]:
            raise _cursor_error("other-query", "the request's position differs from the cursor's pinned basis")
        R = None if body["R"] is None else V.Num.parse(V.Lex(body["R"])).frac
        cut = Cut(scope, body["P"], R, V.Num.parse(V.Lex(body["V"])).frac,
                  None if body["R"] is None else V.RawNumber(body["R"]), V.RawNumber(body["V"]))
        after = body["after"]
    else:
        cut = resolve_cut(run, query.get("cut"))
    rows = [a for a in scope_assertions(run, cut) if visible(a, cut)]
    ids = sorted({a.entityId for a in rows if a.entityType == etype})
    if after is not None:
        ids = [i for i in ids if i > after]
    pages = []
    for start in range(0, max(len(ids), 1), limit):
        chunk = ids[start:start + limit]
        bodies = []
        for entity in chunk:
            body = sorted((a for a in rows if a.entityId == entity), key=lambda a: a.id)
            bodies.append(V.OrderedOut([("entityId", entity), ("bodyOrder", "set (sorted by id here)"),
                                        ("triples", [assertion_output(a) for a in body])]))
        more = start + limit < len(ids)
        cursor = encode_cursor({"scope": cut.scope, "entityType": etype, "P": cut.P,
                                "R": None if cut.R_raw is None else str(cut.R_raw), "V": str(cut.V_raw),
                                "after": chunk[-1]}) if more else None
        pages.append(V.OrderedOut([("entities", bodies), ("hasMore", more), ("nextCursor", cursor)]))
    return V.OrderedOut([("cut", cut.to_output()), ("pageSize", limit), ("pages", pages)])


# --------------------------------------------------------------------------- supports


def q_value_supports(run, query):
    """R-SUP-1 / C5.5 values(attribute): per (entity, attribute, value identity) the live
    supporting assertions in creation order; Q14b: the reported value is the
    representation of the support with the lowest (recordedPosition, op index)."""
    cut = resolve_cut(run, query.get("cut"))
    pattern = _decode_pattern(query.get("pattern") or V.Obj([]))
    groups, erased = {}, {}
    for a in ordered(fact_source(run, cut, pattern)):
        if visible(a, cut) and _pattern_match(a, pattern):
            if a.about is None and is_erased(a, "valueSupports"):
                # Q49c: all erased values of an attribute form one group keyed by the marker
                erased.setdefault((a.entityId, a.attribute), []).append(a)
            else:
                groups.setdefault((a.entityId, a.attribute, read_value(a)), []).append(a.id)
    keys = sorted(groups, key=lambda k: (k[0], k[1], 0, k[2].order_key()))
    rows = [(k[0], k[1], k[2].to_output(), groups[k]) for k in keys]
    rows += [(e, attr, ErasedValue(*members).to_output(), [m.id for m in members])
             for (e, attr), members in erased.items()]
    rows.sort(key=lambda r: (r[0], r[1]))        # stable: readable values first, the marker group last
    return V.OrderedOut([("cut", cut.to_output()), ("supports", [
        V.OrderedOut([("entityId", e), ("attribute", attr), ("value", value), ("count", len(ids)),
                      ("assertionIds", ids)]) for e, attr, value, ids in rows])])


def q_reachability(run, query):
    """R-SUP-2: edges are visible values (ref or string) of one attribute at the cut.

    closure = positive-length reachable set; supports = number of distinct
    node-sequence paths from -> to (DAG only; a cycle on a path is a typed error),
    each path listed with the assertion ids of its edges."""
    cut = resolve_cut(run, query.get("cut"))
    attribute = query["attribute"]
    edges = {}
    for a in ordered(scope_assertions(run, cut)):
        # Q49c: an erased reference cannot be followed
        if a.attribute == attribute and visible(a, cut) and not is_erased(a, "reachability") \
                and a.value.family in ("ref", "string"):
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
                    raise X.TypedError("X-CYCLE", "support counting requires an acyclic path set", node=nxt,
                                       ruling="R-SUP-2: oracle-defined (packet workload 20); no ACC 4.7 row")
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
    """Datalog-like rows (R-AGG-0, Q21 AMB-09 B): one row per entity and per combination
    of distinct visible values of the named attributes. Two equal-valued assertions on
    one entity are one value with two supports and one binding row (SUM 10, COUNT 1);
    equal values on distinct entities are distinct rows. Value identity per R-VAL-3."""
    names = list(match["attributes"].keys())
    etype = match.get("entityType")
    by_entity = {}
    for a in ordered(scope_assertions(run, cut)):
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
            distinct, erased = {}, []
            for a in facts:
                if a.attribute == attr:
                    if is_erased(a, "aggregate"):
                        erased.append(a)
                    else:
                        distinct.setdefault(a.value, a.value)   # first (lowest creation order) representative
            # Q49c: the entity's erased values of the attribute bind once, as the marker group, last
            choices.append(sorted(distinct, key=lambda v: v.order_key()) + ([ErasedValue(*erased)] if erased else []))
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


def _where_constant(cond):
    if cond["op"] == "in":
        return [V.decode_constant(x) for x in cond["values"]]
    return V.decode_constant(cond["value"])


def _preflight_where(where, var_types):
    """E-MIXED-FAMILY is a preflight error: with declared variable families (varTypes),
    a predicate the contract forbids fails before evaluation, even over no rows."""
    for cond in where:
        family = var_types.get(cond["var"])
        if family is None or cond["op"] in ("exists", "missing"):
            continue
        constants = _where_constant(cond)
        for c in constants if isinstance(constants, list) else [constants]:
            probe = _probe_value(family)
            try:
                V.predicate(cond["op"] if cond["op"] != "in" else "eq", probe, c)
            except V.MixedFamily as error:
                raise X.mixed(error)


def _probe_value(family):
    """A representative value of a declared family, for static (preflight) type checks."""
    return {"integer": V.integer(0), "number": V.number(0.0), "decimal": V.decimal("0"),
            "datetime": V.Value("datetime", 0), "string": V.string(""), "ref": V.ref("x"),
            "boolean": V.boolean(False)}.get(family, V.string(""))


def q_aggregate(run, query):
    """ACC 4.4. Aggregates: [{op, var, as, convert?}]; `convert: "toNumber"` is AMB-11's
    explicit conversion before AVG (the 0.1 switch `integerAvg: "convert"` is kept as an
    alias). `varTypes` declares variable families for preflight errors."""
    cut = resolve_cut(run, query.get("cut"))
    var_types = query.get("varTypes") or {}
    where = query.get("where") or []
    _preflight_where(where, var_types)
    aggs = query["aggregates"]
    legacy_convert = "toNumber" if query.get("integerAvg") == "convert" else None
    # preflight (AG-AVG-I, Q8b; R-DEC-7, Q33b): AVG over integers or decimals without conversion is
    # refused before evaluation, from varTypes, or else from the matched rows before any filter (the
    # closest data-driven stand-in for core's type-level preflight, R-AGG-4)
    rows = _rows(run, cut, query["match"])
    for agg in aggs:
        if agg["op"] != "avg" or (agg.get("convert") or legacy_convert) is not None:
            continue
        families = {var_types.get(agg["var"])} | {r[agg["var"]].family for r in rows
                                                   if not isinstance(r[agg["var"]], ErasedValue)}
        if "integer" in families:
            raise X.TypedError("E-INTEGER-AVG", "AVG over integers requires an explicit conversion (toNumber)")
        if "decimal" in families:
            # R-DEC-7 / R-DEC-14 (RULINGS Q43b): E-DECIMAL-AVG
            raise X.TypedError("E-DECIMAL-AVG", "AVG over decimals; write divide(SUM, COUNT, scale, rounding)")
    try:
        for cond in where:
            if cond["op"] in ("exists", "missing"):
                raise V.OracleInputError("aggregate where supports value predicates only")
            expected = _where_constant(cond)
            # Q49c: an erased value matches no value predicate
            rows = [r for r in rows if not isinstance(r[cond["var"]], ErasedValue)
                    and V.predicate(cond["op"], r[cond["var"]], expected, query.get("compare", "typed"))]
    except V.MixedFamily as error:
        raise X.mixed(error)
    group_by = list(query.get("groupBy") or [])
    groups, marker_groups = {}, {}
    for r in rows:
        # Q49c: grouping puts all erased values of an attribute in one group keyed by the marker
        key = tuple(_ERASED_KEY if isinstance(r[g], ErasedValue) else r[g] for g in group_by)
        groups.setdefault(key, []).append(r)
        for g in group_by:
            if isinstance(r[g], ErasedValue):
                marker_groups.setdefault((key, g), []).extend(r[g].assertions)
    if not group_by and not groups:
        groups[()] = []     # AG-EMPTY-UNGROUPED: one row; AG-EMPTY-GROUPED: no rows
    out_rows = []
    for key in sorted(groups, key=lambda k: [(1, ()) if v is _ERASED_KEY else (0, v.order_key()) for v in k]):
        members = groups[key]
        row = [(g, ErasedValue(*marker_groups[(key, g)]).to_output() if v is _ERASED_KEY else v.to_output())
               for g, v in zip(group_by, key)]
        for agg in aggs:
            convert = agg.get("convert") or legacy_convert
            values = [r[agg["var"]] for r in members]
            items = [v for v in values if not isinstance(v, ErasedValue)]   # Q49c: value aggregates skip it
            if agg["op"] == "count":
                _check_count(values)
            if convert is not None and agg["op"] != "avg":
                raise V.OracleInputError("convert is defined for avg only (AMB-11)")
            result = X.aggregate(agg["op"], items, convert=convert if agg["op"] == "avg" else None)
            if agg["op"] == "count":
                result = V.integer(result.payload + (1 if len(items) < len(values) else 0))
            if result is None and query.get("emptyAs") is not None:
                result = V.decode_value(query["emptyAs"])   # AG-PACKET-COALESCE (task-specific)
            row.append((agg.get("as", agg["op"]), None if result is None else result.to_output()))
        out_rows.append(V.OrderedOut(row))
    return V.OrderedOut([("cut", cut.to_output()), ("rows", out_rows)])


_ERASED_KEY = object()      # the marker group key of Q49c


def _check_count(values):
    """AG-COUNT counts distinct values of the variable; Q49c says COUNT of assertions counts
    an erased value. The marker group counts once as a distinct value; where that differs from
    counting each erased assertion (two or more erased assertions bound), the two readings
    disagree and the oracle refuses (R-ERA-4)."""
    erased = [a for v in values if isinstance(v, ErasedValue) for a in v.assertions]
    if len(erased) > 1:
        raise X.TypedError("X-NOT-MODELED", "COUNT over a variable bound to several erased values",
                           ruling="R-ERA-4: Q49c counts erased assertions while AG-COUNT counts distinct values "
                           "(ORCHESTRATOR-RULING-NEEDED)")


def _decode_expr(node):
    """Typed values decode; bare JSON integers and strings pass through as operator
    parameters (scale, precision, rounding of divide / round / toDecimal)."""
    if isinstance(node, list):
        return [node[0]] + [_decode_expr(x) for x in node[1:]]
    if isinstance(node, str):
        return node
    return V.decode_value(node)


def q_expr(run, query):
    return X.evaluate(_decode_expr(query["expr"])).to_output()


def q_compare(run, query):
    """Equality and order between two operands (typed values, untyped constants on the
    right, or expressions such as ["to-number", v] for DEC-CONVERTED-COMPARE). Each of
    eq/ne/lt/gt is a boolean or the preflight error the contract pins (CMP-INT-FLOAT:
    eq false, ordered E-MIXED-FAMILY; CMP-DECIMAL-CROSS: every comparison E-MIXED-FAMILY).
    identical / sameGroup report value identity (CMP-NEGZERO: -0.0 and +0.0 are one)."""
    a = X.evaluate(_decode_expr(query["left"]))
    right = query["right"]
    b = X.evaluate(_decode_expr(right)) if isinstance(right, (list, V.Obj)) else V.decode_constant(right)
    mode = query.get("compare", "typed")
    same = isinstance(b, V.Value) and a == b
    out = [("comparable", V.comparable(a, b, mode)), ("identical", same)]
    for op in ("eq", "ne", "lt", "gt"):
        try:
            out.append((op, V.predicate(op, a, b, mode)))
        except V.MixedFamily as error:
            out.append((op, X.mixed(error).to_output()))
    out.append(("sameGroup", same))
    return V.OrderedOut(out)


def q_sort_values(run, query):
    """ACC 4.5: set semantics (equal values collapse; the first given representation
    survives, Q14b), family order then value order."""
    distinct = {}
    for raw in query["values"]:
        v = V.decode_value(raw)
        distinct.setdefault(v, v)
    return [v.to_output() for v in sorted(distinct, key=lambda v: v.order_key())]
