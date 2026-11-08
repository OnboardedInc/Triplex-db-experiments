"""Spec item 13 self-checks: reproduce O-HAM finite-nine, O-CFG8 tiny-v4 and O-EVT
cut semantics where the domains overlap. Each check re-expresses the other
oracle's fixture as an O-REPLAY case (command stream + receipts) and compares the
replayed answers with the other oracle's frozen expectations.

RULINGS Q70n adds an execution check: every query kind whose output carries a next*
field is in run.CONTINUATIONS with that field as its issued value, so a new paged kind
cannot be left outside the one continuation rule.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

from . import run as RUN
from . import scale as S
from . import values as V

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

SOURCES = {
    "ham-v2-oracle": "qualification/capacity/historical-assertion-metadata-v2/oracle.mjs",
    "ham-v1-oracle": "qualification/capacity/historical-assertion-metadata-v1/oracle.mjs",
    "cfg8-tiny-v4-oracle": "qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json",
    "cfg8-contract": "qualification/capacity/configured-entities-v1/CONTRACT.md",
    "evt-workloads": "qualification/workloads/temporal-workloads.json",
    "evt-oracle": "qualification/workloads/event_oracles.py",
}
MISSING_FIXTURES = {
    "qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json":
        "independent V4 review naming the five failing retirement-metadata checks (sha256 a79d1ad9...c95c1 per "
        "historical-assertion-metadata-v1/reproducers.json)",
    "qualification/reviews/historical-assertion-metadata-v1-source-independent.json":
        "independent v1 source review cited by historical-assertion-metadata-v2/README.md",
}


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def evaluate(case):
    text = json.dumps(case).encode()
    return RUN.evaluate_text(text)


def plain(node):
    """Expected-output tree -> plain JSON values (numbers as floats) for comparison."""
    return json.loads(V.dumps(node, indent=0))


def query_result(report, qid):
    for q in report.get("queries"):
        if q.get("id") == qid:
            res = q.get("result")
            return plain(res) if res is not None else plain(q.get("error"))
    raise KeyError(qid)


# --------------------------------------------------------------------------- O-HAM


def _ham_case(events, scope):
    commands, receipts = [], []
    for i, event in enumerate(events):
        ops = [{"op": "retract", "target": rid} for rid in event["retract"]]
        ops += [{"op": "assert", "ref": a["id"], "entityId": a["entityId"], "attribute": a["attribute"],
                 "value": a["value"], "entityType": a["entityType"], "createdBy": a["createdBy"],
                 "validFrom": a["validFrom"], "validTo": a["validTo"]} for a in event["assert"]]
        commands.append({"scope": scope, "clock": event["recordedAt"], "operations": ops})
        receipts.append({"command": i, "outcome": "committed", "txId": event["txId"], "position": event["position"],
                         "instant": event["recordedAt"],
                         "assertionIds": [op.get("ref") if op["op"] == "assert" else None for op in ops]})
    return commands, receipts


def check_ham():
    ref = json.loads((HERE / "selfcheck_fixtures/ham-v2-reference.json").read_text())
    results = []
    status_source = ref["sourceSha256"] == sha(SOURCES["ham-v2-oracle"])
    results.append({"check": "ham-reference-source-hash", "pass": status_source})
    queries = []
    for c in ref["cases"]:
        cut = {"scope": "ham", "position": c["capturedUpperP"], "validAt": c["validAt"]}
        if "recordedAt" in c:
            cut["recordedAt"] = c["recordedAt"]
        queries.append({"id": c["id"], "kind": "assertionSnapshot", "mode": c.get("mode", "live-at-valid"), "cut": cut})
    for i, c in enumerate(ref["sameTimeCases"]):
        queries.append({"id": f"same-time-P{c['capturedUpperP']}", "kind": "assertionSnapshot",
                        "cut": {"scope": "same", "position": c["capturedUpperP"], "recordedAt": c["recordedAt"],
                                "validAt": c["validAt"]}})
    queries.append({"id": "lifetime", "kind": "assertions", "scope": "ham"})
    c1, r1 = _ham_case(ref["events"], "ham")
    c2, r2 = _ham_case(ref["sameTimeEvents"], "same")
    for r in r2:
        r["command"] += len(c1)
    case = {"format": RUN.CASE_FORMAT, "caseId": "selfcheck-ham", "defaultScope": "ham",
            "adapter": {"schemaVersion": 1}, "commands": c1 + c2, "receipts": r1 + r2, "queries": queries}
    report = evaluate(case)
    results.append({"check": "ham-receipts-and-outcomes", "pass": report.get("verdict") == "PASS"})

    def norm(row):
        out = {k: row[k] for k in ("id", "entityId", "attribute", "value", "entityType", "validFrom", "validTo",
                                   "createdBy", "schemaVersion", "recordedAt", "txId", "knownRetirement")}
        kr = out["knownRetirement"]
        if kr is not None:
            # Q21 AMB-02: O-REPLAY emits the logical names {retractedAt, retractTxId} (+ retractedPosition);
            # O-HAM v2's SnapshotAssertion spells the same content {recordedAt, txId}
            out["knownRetirement"] = {"recordedAt": kr["retractedAt"], "txId": kr["retractTxId"]}
        return out

    for c in ref["cases"]:
        got = [norm(r) for r in query_result(report, c["id"])["assertions"]]
        results.append({"check": f"ham-case:{c['id']}", "pass": got == c["expected"]})
    for c in ref["sameTimeCases"]:
        got = [norm(r) for r in query_result(report, f"same-time-P{c['capturedUpperP']}")["assertions"]]
        results.append({"check": f"ham-same-time:P{c['capturedUpperP']}", "pass": got == c["expected"]})
    lifetime = query_result(report, "lifetime")["assertions"]
    mine = {r["id"]: r for r in lifetime}
    ok = len(lifetime) == len(ref["lifetime"])
    for row in ref["lifetime"]:
        m = mine.get(row["id"])
        want = None if row["retirement"] is None else row["retirement"]
        got = None if m is None or m["retractedPosition"] is None else {
            "recordedAt": m["retractedAt"], "position": m["retractedPosition"], "txId": m["retractTxId"]}
        ok = ok and m is not None and got == want and m["recordedPosition"] == row["assertion"]["position"]
    results.append({"check": "ham-raw-lifetime-retirement-authority", "pass": ok})
    # open-ended validity (v2 added definition)
    open_case = {"format": RUN.CASE_FORMAT, "caseId": "selfcheck-ham-open", "defaultScope": "open",
                 "adapter": {"schemaVersion": 1},
                 "commands": [{"scope": "open", "clock": 1000.25, "operations": [
                     {"op": "assert", "ref": "open", "entityId": "metadata:open", "attribute": ":metadata/label",
                      "value": {"type": "string", "value": "open"}, "entityType": "MetadataProbe",
                      "createdBy": "metadata-fixture", "validFrom": 10.125}]}],
                 "receipts": [{"command": 0, "outcome": "committed", "txId": "open-tx", "position": 1,
                               "instant": 1000.25, "assertionIds": ["open"]}],
                 "queries": [{"id": f"open-{i}", "kind": "assertionSnapshot",
                              "cut": {"scope": "open", "position": 1, "recordedAt": 1000.25, "validAt": c["validAt"]}}
                             for i, c in enumerate(ref["openEnded"])]}
    rep = evaluate(open_case)
    for i, c in enumerate(ref["openEnded"]):
        got = [norm(r) for r in query_result(rep, f"open-{i}")["assertions"]]
        results.append({"check": f"ham-open-ended:validAt={c['validAt']}", "pass": got == c["expected"]})
    return results


# --------------------------------------------------------------------------- O-CFG8


def _cfg_value(abstract):
    family = abstract["type"]
    if "lexeme" in abstract:
        text = abstract["lexeme"]
        return {"type": family, "value": float(text) if any(c in text for c in ".e") else int(text)}
    return {"type": family, "value": abstract["value"]}


def cfg8_case(n, width):
    ent = lambda i: "capacity:e" + str(i).zfill(8)
    commands, phase_of = [], []
    clock = 1000.25
    commands.append({"kind": "internal", "clock": clock, "note": "schema v1 ConfigStore.commit"})
    phase_of.append(None)
    stream = list(S.generator_stream(n, width, split_dense_seed=True))
    for k, (phase, ops) in enumerate(stream):
        if phase == 1 and stream[k - 1][0] == 0:
            clock += 1
            commands.append({"kind": "internal", "clock": clock, "note": "schema v2 ConfigStore.commit"})
            phase_of.append(None)
        case_ops = []
        for op in ops:
            if op["op"] == "assert":
                case_ops.append({"op": "assert", "ref": op["ref"], "entityId": ent(op["entity"]),
                                 "attribute": f":capacity/{op['field']}", "value": _cfg_value(op["value"]),
                                 "entityType": "CapacityEntity", "validFrom": 10.125, "validTo": 30.5})
            else:
                case_ops.append(op)
        clock += 1
        commands.append({"clock": clock, "operations": case_ops})
        phase_of.append(phase)
    last = {}
    for i, p in enumerate(phase_of):
        if p is not None:
            last[p] = i
    queries = [{"id": "relation", "kind": "assertions"}]
    for phase in range(4):
        for name, v in (("inside", 20.25), ("start", 10.125), ("end", 30.5)):
            queries.append({"id": f"cut-{phase}-{name}", "kind": "match",
                            "cut": {"position": {"afterCommand": last[phase]}, "validAt": v}})
    queries.append({"id": "counts", "kind": "analyticCounts", "n": n, "width": width})
    case = {"format": RUN.CASE_FORMAT, "caseId": f"selfcheck-cfg8-{n}-{width}", "defaultScope": "cfg8",
            "adapter": {"schemaVersion": 1}, "commands": commands, "queries": queries}
    return case, phase_of


def _plain_value(v):
    family = v["type"]
    if family == "integer":
        return {"type": "integer", "value": v["value"]}
    return v["value"]


def check_cfg8():
    oracle = json.loads((ROOT / SOURCES["cfg8-tiny-v4-oracle"]).read_text())
    results = []
    for profile, width in (("sparse", 1), ("dense", 10)):
        expected = oracle[profile]
        case, phase_of = cfg8_case(8, width)
        report = evaluate(case)
        relation = query_result(report, "relation")["assertions"]
        # synthesized positions are 1..len(commands) in stream order (internal writes included)
        position_phase = {i + 1: p for i, p in enumerate(phase_of)}
        rows = []
        for a in relation:
            rows.append({"identity": a["id"], "entity": int(a["entityId"][-8:]),
                         "field": a["attribute"].split("/", 1)[1], "value": _plain_value(a["value"]),
                         "asserted": position_phase[a["recordedPosition"]],
                         "retired": None if a["retractedPosition"] is None else position_phase[a["retractedPosition"]]})
        key = lambda r: r["identity"]
        results.append({"check": f"cfg8-{profile}-rows", "pass": sorted(rows, key=key) == sorted(expected["rows"], key=key),
                        "rows": len(rows), "expectedRows": len(expected["rows"])})
        for c in expected["cuts"]:
            phase = c["phase"]
            inside = query_result(report, f"cut-{phase}-inside")["raw"]
            ids = sorted(r["id"] for r in inside)
            configured = sum(1 for r in inside if r["attribute"] == ":capacity/present" and r["value"]["value"] is True)
            results.append({"check": f"cfg8-{profile}-cut-{phase}",
                            "pass": ids == sorted(c["active"]) and configured == c["configuredEntities"]})
            start = sorted(r["id"] for r in query_result(report, f"cut-{phase}-start")["raw"])
            end = query_result(report, f"cut-{phase}-end")["raw"]
            results.append({"check": f"cfg8-{profile}-cut-{phase}-valid-window",
                            "pass": start == ids and len(end) == expected["validTime"]["activeAtExclusiveEnd"]})
        counts = query_result(report, "counts")
        results.append({"check": f"cfg8-{profile}-analytic-counts", "pass": counts == expected["counts"]})
    return results


# --------------------------------------------------------------------------- O-EVT


def _evt_value(cell):
    tag = cell["tag"]
    if tag == "str":
        return {"type": "string", "value": cell["value"]}
    if tag == "i64":
        return {"type": "integer", "value": cell["value"]}
    if tag == "bool":
        return {"type": "boolean", "value": cell["value"]}
    raise ValueError(tag)


def _cell(v):
    family = v["type"]
    return {"string": "str", "integer": "i64", "boolean": "bool", "ref": "str"}[family], v["value"]


OVERLAP = {"state_at", "relation_exists", "account_balance", "reachability_supports", "reachability_closure"}


def _load_event_oracle():
    spec = importlib.util.spec_from_file_location("o_evt_event_oracles", ROOT / SOURCES["evt-oracle"])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def evt_case(workload):
    """Normalized packet assertions -> one command per known position k: assert those
    whose known interval starts at k, retract those whose known interval ends at k."""
    top = max([int(a["known"][0]) for a in workload["assertions"]] +
              [int(a["known"][1]) for a in workload["assertions"] if a["known"][1] is not None] +
              [int(c["cut"]["known_at"]) for c in workload["cases"]])
    commands = []
    for k in range(1, top + 1):
        ops = [{"op": "retract", "target": a["id"]} for a in workload["assertions"]
               if a["known"][1] is not None and int(a["known"][1]) == k]
        for a in workload["assertions"]:
            if int(a["known"][0]) == k:
                op = {"op": "assert", "ref": a["id"], "entityId": a["entity"], "attribute": a["attribute"],
                      "value": _evt_value(a["value"]), "validFrom": int(a["valid"][0])}
                if a["valid"][1] is not None:
                    op["validTo"] = int(a["valid"][1])
                ops.append(op)
        commands.append({"clock": k, "operations": ops})
    queries = []
    for c in workload["cases"]:
        if c["operation"] not in OVERLAP:
            continue
        p = c["parameters"]
        cut = {"position": int(c["cut"]["known_at"]), "validAt": int(c["cut"]["valid_at"]), "publicBasis": False}
        q = {"id": c["id"], "cut": cut, "operation": c["operation"]}
        if c["operation"] in ("state_at", "relation_exists"):
            q.update(kind="valueSupports", pattern={"entityId": p["entity"]["value"], "attribute": p["attribute"]["value"]})
        elif c["operation"] == "account_balance":
            q.update(kind="aggregate", match={"attributes": {"acct": "account", "cur": "currency", "amt": "amount"}},
                     where=[{"var": "acct", "op": "eq", "value": _evt_value(p["account"])},
                            {"var": "cur", "op": "eq", "value": _evt_value(p["currency"])}],
                     aggregates=[{"op": "sum", "var": "amt", "as": "balance"}],
                     emptyAs={"type": "integer", "value": "0"})
        else:
            q.update(kind="reachability", attribute="edge", **{"from": p["from"]["value"]})
            if c["operation"] == "reachability_supports":
                q["to"] = p["to"]["value"]
        queries.append(q)
    return {"format": RUN.CASE_FORMAT, "caseId": f"selfcheck-evt-{workload['id']}", "defaultScope": "packet",
            "commands": commands, "queries": queries}


def _rows_from(c, result):
    op = c["operation"]
    if op == "state_at":
        return [[_cell(s["value"])] for s in result["supports"]]
    if op == "relation_exists":
        target = c["parameters"]["target"]["value"]
        return [[("bool", any(s["value"]["value"] == target for s in result["supports"]))]]
    if op == "account_balance":
        return [[_cell(r["balance"])] for r in result["rows"]]
    if op == "reachability_supports":
        return [[("bool", result["reachable"]), ("i64", str(result["supportCount"]))]]
    return [[("str", node)] for node in result["closure"]]


def check_evt():
    packet = json.loads((ROOT / SOURCES["evt-workloads"]).read_text())
    evt = _load_event_oracle()
    results = []
    for workload in packet["workloads"]:
        cases = [c for c in workload["cases"] if c["operation"] in OVERLAP]
        if not cases:
            continue
        report = evaluate(evt_case(workload))
        for c in cases:
            got = {tuple(row) for row in _rows_from(c, query_result(report, c["id"]))}
            want = {tuple((cell["tag"], cell["value"]) for cell in row) for row in c["expected_rows"]}
            evt_rows = evt.event_rows(workload, c)
            evt_ok = evt_rows is not None and evt.identity(evt_rows) == want
            results.append({"check": f"evt-{workload['id']}/{c['id']}", "operation": c["operation"],
                            "pass": got == want, "oEvtAgrees": evt_ok})
    return results


# --------------------------------------------------------------------------- Q70l


def _paged_case():
    ops = [{"op": "assert", "ref": f"a{k}", "entityId": f"e{k}", "attribute": ":x/v", "entityType": "T",
            "value": {"type": "integer", "value": str(k)}, "validFrom": 0} for k in range(3)]
    commands = [{"clock": 100 + k, "operations": [op]} for k, op in enumerate(ops)]
    queries = [{"id": "entityPage", "kind": "entityPage", "entityType": "T", "limit": 1, "cut": {"validAt": 1}},
               {"id": "transactions", "kind": "transactions", "limit": 1},
               {"id": "transactionsForEntity", "kind": "transactionsForEntity", "entityId": "e0", "limit": 1}]
    commands.append({"clock": 200, "operations": [dict(ops[0], ref="b0", value={"type": "integer", "value": "9"})]})
    return {"format": RUN.CASE_FORMAT, "caseId": "selfcheck/continuations", "defaultScope": "s",
            "commands": commands, "queries": queries}


def _next_keys(node, out):
    if isinstance(node, dict):
        for k, v in node.items():
            if k.startswith("next"):
                out.add(k)
            _next_keys(v, out)
    elif isinstance(node, list):
        for v in node:
            _next_keys(v, out)
    return out


def _continuation_cases(kind):
    """Generated empty/populated reads, including single and multi-page output."""
    for populated in (False, True):
        for limit in (1, 2):
            case = _paged_case()
            if not populated:
                case["commands"] = []
            case["queries"] = []
            case["schemas"] = [{"version": 1, "entityTypes": {"T": {"attributes": {
                "v": {"attribute": ":x/v", "type": "integer", "cardinality": "many"}}}}}]
            value = {"type": "integer", "value": "1"}
            query = {"id": kind, "kind": kind, "entityType": "T", "entityId": "e0", "entityIds": ["e0", "e1"],
                     "limit": limit, "pageSize": limit, "cut": {"validAt": 1}, "attribute": ":x/v",
                     "prop": "v", "from": "e0", "txId": "tx:0", "commandId": "c0", "match": {"attributes": {"v": ":x/v"}},
                     "aggregates": [{"op": "count", "var": "v", "as": "n"}], "expr": value, "left": value, "right": value,
                     "values": [value], "n": 3, "width": 1}
            yield V.loads(json.dumps(case)), V.loads(json.dumps(query))


def check_continuations(table=None, queries=None):
    """Q70n: execute every registered handler and inspect its serialized output recursively.
    A new handler requiring another fixture fails closed until it can be exercised."""
    table = RUN.CONTINUATIONS if table is None else table
    queries = RUN.QUERIES if queries is None else queries
    rows = []
    for kind, handler in sorted(queries.items()):
        fields, errors, exercised = set(), [], 0
        for case, query in _continuation_cases(kind):
            try:
                run = RUN.Run(case)
                run.process()
                try:
                    output = handler(run, query)
                except V.OracleInputError as error:
                    # [O-REPLAY-049] Why: the three explicitly unsupported key handlers execute
                    # their only behavior, a refusal. Rejected: accepting arbitrary input errors
                    # (a future handler missing required fixture inputs must fail closed).
                    if handler is not RUN._order_keys_not_modeled:
                        raise
                    output = {"inputError": str(error)}
                fields |= _next_keys(plain(output), set())
                exercised += 1
            except Exception as error:
                errors.append(f"{type(error).__name__}: {error}")
        spec = table.get(kind)
        allowed = {spec["issued"]} if spec else set()
        rows.append({"check": f"continuation-runtime:{kind}",
                     "pass": exercised == 4 and not errors and fields == allowed,
                     "exercised": exercised, "nextFields": sorted(fields), "issued": spec and spec["issued"],
                     "errors": errors})
    for kind in sorted(set(table) - set(queries)):
        rows.append({"check": f"continuation-runtime:{kind}", "pass": False, "errors": ["unregistered table kind"]})
    return rows


def run_all():
    sections = [("O-HAM finite-nine (v2 nine definitions, same-R control)", check_ham),
                ("O-CFG8 tiny-v4", check_cfg8), ("O-EVT cut semantics (overlap)", check_evt),
                ("Q70l continuation table", check_continuations)]
    out, all_pass = [], True
    for title, fn in sections:
        rows = fn()
        passed = sum(1 for r in rows if r["pass"])
        all_pass = all_pass and passed == len(rows)
        out.append(V.OrderedOut([("section", title), ("passed", passed), ("total", len(rows)),
                                 ("checks", [V.OrderedOut(r.items()) for r in rows])]))
    return V.OrderedOut([
        ("format", "triplex-db-2/o-replay-selfcheck/1"), ("status", "PASS" if all_pass else "FAIL"),
        ("sources", V.OrderedOut((k, V.OrderedOut([("path", p), ("sha256", sha(p))])) for k, p in SOURCES.items())),
        ("missingFixtures", V.OrderedOut((k, V.OrderedOut([("present", (ROOT / k).exists()), ("what", v)]))
                                         for k, v in MISSING_FIXTURES.items())),
        ("oracleSourceSha256", RUN.source_hashes()),
        ("sections", out)])
