"""Test helpers: build cases as plain Python, evaluate through the real text path."""

import json

from lab.oracles.replay import run as RUN
from lab.oracles.replay import values as V


def val(text):
    """Decode a typed value from JSON text (keeps number lexemes exact)."""
    return V.decode_value(V.loads(text))


def s(x):
    return {"type": "string", "value": x}


def i64(x):
    return {"type": "integer", "value": str(x)}


def ref(x):
    return {"type": "ref", "value": x}


def assert_op(ref_, entity, attribute, value, valid_from=0, valid_to=None, entity_type=None, **extra):
    op = {"op": "assert", "ref": ref_, "entityId": entity, "attribute": attribute, "value": value,
          "validFrom": valid_from}
    if valid_to is not None:
        op["validTo"] = valid_to
    if entity_type is not None:
        op["entityType"] = entity_type
    op.update(extra)
    return op


def case(commands, queries=(), receipts=None, **extra):
    c = {"format": RUN.CASE_FORMAT, "caseId": "unit", "defaultScope": "s", "commands": list(commands),
         "queries": list(queries)}
    if receipts is not None:
        c["receipts"] = receipts
    c.update(extra)
    return c


def evaluate(c, raw_text=None):
    text = raw_text if raw_text is not None else json.dumps(c)
    return json.loads(V.dumps(RUN.evaluate_text(text.encode())))


def result(report, qid):
    for q in report["queries"]:
        if q["id"] == qid:
            return q.get("result", q.get("error"))
    raise KeyError(qid)


def outcome(report, index):
    return report["commandOutcomes"][index]["expected"]


def committed_receipts(c, start=1, instants=None):
    """Receipts that bind identities for every command, in stream order."""
    out = []
    for k, cmd in enumerate(c["commands"]):
        ops = cmd.get("operations") or []
        out.append({"command": k, "outcome": "committed", "txId": f"T{k}", "position": start + k,
                    "instant": (instants[k] if instants else cmd.get("clock", 1000 + k)),
                    "assertionIds": [f"id-{op['ref']}" if op["op"] == "assert" else None for op in ops]})
    return out
