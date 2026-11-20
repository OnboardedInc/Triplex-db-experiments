"""Replay the two captured 6011 worlds through the independent W0 oracle."""

import collections
import hashlib
import json
import pathlib
import subprocess
import sys


def digest(data):
    return hashlib.sha256(data).hexdigest()


def replay(probe, sample):
    request, response = sample["request"], sample["response"]
    subject, basis = probe["subject"], request["basis"]
    cut, valid = basis["recordedPosition"], basis["validAt"]
    assert request["roots"] == [subject] and request["full"] and request["rowPage"]
    assert response["position"] == cut and not response["reset"]
    assert digest(json.dumps(response, separators=(",", ":")).encode()) == sample["responseSha256"]
    entities = {entity: rows for entity, _, rows in response["entities"]}
    assert len(entities) == len(response["entities"])
    seen, pending, facts, links = set(), [subject], [], collections.defaultdict(list)
    while pending:
        entity = pending.pop()
        if entity in seen:
            continue
        seen.add(entity)
        for row in entities[entity]:
            tx, assertion, owner, attr, kind, value = row[:6]
            assert owner == entity and 0 < int(tx) <= cut
            if row[11] > valid or (row[12] is not None and row[12] <= valid):
                continue
            assert kind in ("ref", "integer", "string"), "unexpected wire type in subject 6011"
            if kind == "ref":
                pending.append(value)
                links[entity, attr, value].append({"position": int(tx), "assertion": assertion})
            facts.append({"e": entity, "a": attr, "v": int(value) if kind == "integer" else value, "tx": int(tx)})
    # [DX-BM1] Why: the oracle must see every visible fact, including repeated references with distinct assertion IDs.
    # Rejected: constructing a set of EAV values, which erases the precise W0 failure being investigated.
    assert valid == 1793793600000
    document = {"release": "R1", "basis": {"tx": cut, "validTime": "2026-11-04T12:00:00.000000Z"},
                "world": {"subject": subject, "facts": facts}}
    oracle = pathlib.Path("lab/oracles/domain/cli.py")
    result = subprocess.run([sys.executable, "-I", str(oracle), "evaluate", "-"],
                            input=json.dumps(document).encode(), capture_output=True, check=True)
    evaluated = json.loads(result.stdout)
    assert evaluated.get("error") == (None if cut == 4338757 else "W0.E_CARDINALITY")
    if cut == 4338757:
        assert evaluated["subject"] == subject and evaluated["basis"]["tx"] == cut
    duplicates = [{"entity": e, "attribute": a, "value": v, "rows": rows}
                  for (e, a, v), rows in links.items() if len(rows) > 1]
    return {"position": cut, "visibleFacts": len(facts), "reachableEntities": len(seen),
            "responseSha256": sample["responseSha256"], "oracleSha256": digest(result.stdout),
            "error": evaluated.get("error"), "duplicateReferences": duplicates}


if __name__ == "__main__":
    data = pathlib.Path(sys.argv[1]).read_bytes()
    probe = json.loads(data)
    assert probe["subject"] == "pl:s00006011"
    results = [replay(probe, sample) for sample in probe["positions"]]
    assert [r["position"] for r in results] == [4338757, 4346080]
    assert not results[0]["duplicateReferences"]
    assert any([row["position"] for row in link["rows"]] == [4341356, 4344665]
               for link in results[1]["duplicateReferences"])
    print(json.dumps({"probeSha256": digest(data), "scope": probe["scope"], "slot": probe["slot"],
                      "containerId": probe["containerId"], "subject": probe["subject"], "results": results}, indent=2))
