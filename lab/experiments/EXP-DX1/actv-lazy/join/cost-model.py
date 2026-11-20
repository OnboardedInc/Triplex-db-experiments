"""Compact fixture cardinalities and linear planning estimates from sealed native trials."""
import hashlib
import json
import sys
from pathlib import Path


def cardinality(n):
    wage = new = overtime = documents = broad = 0
    for i in range(n):
        if i % 97 == 0:
            continue
        place = i % 10
        pay = 1450 + i * 37 % 600
        below = place % 3 == 0 and pay < 1700
        document = i % 23 == 0
        documents += document
        broad += below or document
        if below:
            wage += 1
            new += pay >= 1500 + place % 2 * 150
        overtime += 2351 < 2200 + i % 600 <= 2400
    return {"wage-stored": (wage, wage + new), "overtime-stored": (overtime, overtime),
            "three-rules": (broad, wage + new + 3 * documents)}


def evidence(directory):
    root = Path(directory)
    load = lambda k: json.loads((root / k).read_text())
    receipt, attempt = load("verified.json"), load("attempt.json")
    assert all(receipt[k] == v for k, v in attempt.items())
    assert attempt["mode"] == "--joined-price"
    for f, h in receipt["outputs"].items():
        assert hashlib.sha256((root / f).read_bytes()).hexdigest() == h
    price = load("join-price.json")
    n = price["n"]
    assert int(attempt["size"]) == n and n in (1000, 10000)
    shape = cardinality(n)
    stages = {s["id"]: s for s in price["stages"]}
    owe = stages["wage-debt"]
    assert owe["worlds"] == owe["pages"] == 0 and owe["physicalChanges"] == 4
    assert owe["proof"]["owed"] - stages["baseline"]["proof"]["owed"] == shape["wage-stored"][0]
    assert stages["overtime-stored"]["proof"]["owed"] == stages["restore-again"]["proof"]["owed"]
    assert stages["three-rules"]["proof"]["owed"] - stages["restore-final"]["proof"]["owed"] == shape["wage-stored"][0]
    for name, (owners, facts) in shape.items():
        s = stages[name]
        assert (s["proof"]["stored"], s["proof"]["changes"]) == (owners, facts)
        assert s["first"]["position"] == s["p"] and s["firstCorrectMs"] >= s["durableMs"]
    assert hashlib.sha256((root / "inputs.json").read_bytes()).hexdigest() == attempt["inputs"]
    assert hashlib.sha256((root / "owner.json").read_bytes()).hexdigest() == attempt["owner"]
    # The reducer can be corrected without changing which runtime bytes were priced.
    runtime = {f: h for f, h in load("inputs.json").items() if not f.endswith("/cost-model.py")}
    return n, (stages, runtime, attempt["volume"], attempt["nonce"])


def estimate(paths):
    inputs = dict(evidence(p) for p in paths)
    assert list(sorted(inputs)) in ([1000], [1000, 10000])
    assert len(inputs) == len(paths)
    runtime = inputs[1000][1]
    assert all(v[1] == runtime for v in inputs.values())
    assert len({v[2] for v in inputs.values()}) == len(inputs)
    assert len({v[3] for v in inputs.values()}) == len(inputs)
    forecasts = {}
    for n in (100000, 1000000):
        shape = cardinality(n)
        forecasts[n] = {}
        for name, (owners, rows) in shape.items():
            fits = []
            for rung, (stages, _, _, _) in sorted(inputs.items()):
                base = stages["wage-debt"]
                measured = stages[name]
                # Native source pages and subject pulls both grow with roster size on this distribution.
                ms = base["durableMs"] + (measured["durableMs"] - base["durableMs"]) * n / rung
                ratio = rows / measured["proof"]["changes"]
                wire = base["nativeRequestBytes"] + (measured["nativeRequestBytes"] - base["nativeRequestBytes"]) * ratio
                fits.append({"rung":rung, "workSeconds":ms/1000, "transactionBytes":round(wire),
                             "fitsGatewayEstimate":wire <= 4194304,
                             "literalEncodedBytes":round(measured["proof"]["envelope"]["encodedBytes"] * n / rung)})
            forecasts[n][name] = {"changedPeople":owners, "changedRows":rows,
                                  "owed":shape["wage-stored"][0] if name!="overtime-stored" else 0, "fits":fits}
    return forecasts


if __name__ == "__main__":
    print(json.dumps(estimate(sys.argv[1:]), indent=2))
