"""Run the dispatch differential and compare every intermediate snapshot with pinned O-REPLAY."""

import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

ORACLE = "03d86f3346cccd6794487b77293fb56077dd020e"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def digest(file):
    with file.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def save(path, value):
    with path.open("x") as f:
        json.dump(value, f, indent=2)
        f.write("\n")


def db(attempt, suffix):
    key = json.dumps(["triplex-scope-v1", "test", "prep1-gate", f"{attempt}-{suffix}", 0],
                     separators=(",", ":"))
    return "s2-" + base64.urlsafe_b64encode(key.encode()).decode().rstrip("=")


def oracle_case(arm):
    commands, queries, receipts = [], [], []
    previous = {}
    asserted = {}
    cuts = arm["snapshots"]
    for i, (cmd, receipt) in enumerate(zip(arm["commands"], arm["receipts"], strict=True)):
        owner, identifier, old = cmd["owner"], cmd["add"], cmd["retire"]
        ops = []
        if old:
            assert old == previous[owner]
            ops.append({"op": "retract", "target": old})
        ops.append({"op": "assert", "ref": identifier, "entityId": owner, "attribute": ":v",
                    "value": {"type": "string", "value": identifier}, "validFrom": 0})
        previous[owner] = identifier
        assert receipt["position"] == i + 1 and receipt["clock"] == 1000 + i
        tx = "_tx/" + cmd["id"]
        added = {"op": "assert", "tripleId": identifier, "entityId": owner, "attribute": ":v",
                 "value": {"type": "string", "value": identifier}, "validFrom": 0,
                 "recordedAt": 1000 + i, "assertionTxId": tx}
        changes = [added]
        suffixes = ["p", "t", "cmd", "owner", "add"]
        if old:
            suffixes.append("retire")
            changes.append({**asserted[old], "op": "retract", "retractedAt": 1000 + i, "retractionTxId": tx})
        asserted[identifier] = added
        assert arm["feed"][i] == [tx, i + 1, sorted(cmd["id"] + "/" + x for x in suffixes), changes]
        commands.append({"kind": "transact", "operations": ops,
                         "meta": {"commandId": cmd["id"]}, "physicalGroup": f"t{receipt['t']}"})
        receipts.append({"command": i, "outcome": "committed", "position": i + 1,
                         "instant": receipt["clock"], "txId": tx,
                         "assertionIds": ([None] if old else []) + [identifier]})
        for n, e in enumerate(sorted(previous)):
            queries.append({"id": f"p{i+1}-{n}", "kind": "entityTriples", "entityId": e,
                            "cut": {"position": i + 1, "validAt": 1}})
    assert len(cuts) == len(commands) == 18
    return {"format": "triplex-db-2/o-replay-case/1", "caseId": arm["db"], "defaultScope": "s",
            "adapter": {"schemaVersion": 1}, "commands": commands, "receipts": receipts, "queries": queries}


def assert_oracle(document, case, observed):
    assert document["verdict"] == "PASS" and document["receiptConsistency"]["violations"] == []
    assert len(document["commandOutcomes"]) == len(case["commands"])
    assert all(r["verdict"] == "PASS" for r in document["commandOutcomes"])
    actual = {}
    for q, q_expected in zip(document["queries"], case["queries"], strict=True):
        assert q["id"] == q_expected["id"]
        cut = q_expected["cut"]["position"]
        actual.setdefault(cut, []).extend([
            {"id": x["id"], "entity_id": x["entityId"], "attribute": x["attribute"],
             "value_string": x["value"]["value"], "recorded_position": x["recordedPosition"]}
            for x in q["result"]["snapshot"]
        ])
    assert [sorted(actual[p], key=lambda x: x["id"]) for p in sorted(actual)] == observed


def run(java, datomic, out):
    assert not out.exists()
    out.mkdir()
    attempt = str(uuid.uuid4())
    gateway = ROOT / "packages/datomic/gateway/src"
    codec = ROOT / "packages/datomic/src/codec-spec.json"
    jars = [datomic / "datomic-transactor-pro-1.0.7745.jar", *sorted((datomic / "lib").glob("*.jar"))]
    sources = [HERE / "gate.clj", Path(__file__).resolve(), codec, *sorted(gateway.rglob("*.clj"))]
    manifest = {str(f.relative_to(ROOT)): digest(f) for f in sources}
    save(out / "inputs.json", {"attempt": attempt, "source": manifest, "oracle": ORACLE})
    log = out / "native.log"
    argv = [java, "-Xms64m", "-Xmx464m", "-XX:ActiveProcessorCount=2", "-XX:-UsePerfData",
            f"-Djava.io.tmpdir={out}", f"-Dtriplex.codec.spec={codec}",
            "-cp", os.pathsep.join(map(str, [gateway, *jars, datomic / "resources"])),
            "clojure.main", HERE / "gate.clj"]
    with log.open("x") as stream:
        subprocess.run(argv, cwd=ROOT, stdin=subprocess.DEVNULL, stdout=stream, stderr=subprocess.STDOUT,
                       env=dict(os.environ, PREP1_ATTEMPT=attempt, TX2_PREDECESSOR_LOOKUP="1"),
                       check=True)
    assert manifest == {str(f.relative_to(ROOT)): digest(f) for f in sources}
    events = [json.loads(line[11:]) for line in log.read_text().splitlines() if line.startswith("PREP1_GATE ")]
    assert {e["attempt"] for e in events} == {attempt}
    assert [e["kind"] for e in events] == ["pair"] * 4 + ["witness"] * 6 + ["window"] * 6 + ["basis"] * 12 + ["finished"]
    assert [e["data"]["salt"] for e in events[:4]] == [17, 43, 503, 2601]
    witnesses = [e["data"] for e in events[4:10]]
    assert [e["mode"] for e in witnesses] == ["unrelated", "revision", "retired", "identity", "claim", "lost"]
    assert all(e["db"] == db(attempt, e["mode"]) for e in witnesses)
    windows = [e["data"] for e in events[10:16]]
    expected_windows = [(w, c) for w in ("prepare", "two") for c in ("ordinary", "moved", "lost")]
    for event, (window, scenario) in zip(windows, expected_windows, strict=True):
        assert (event["window"], event["scenario"]) == (window, scenario)
        assert event["db"] == db(attempt, f"{window}-{scenario}")
        begin = 10 if scenario == "moved" else 9
        assert [r["position"] for r in event["receipts"]] == list(range(begin, begin + 8))
        assert len({r["t"] for r in event["receipts"]}) == 2
        replies = event["replies"]
        assert [replies[i].get("replays") for i in (0, 4)] == (
            ([1, int(window == "two")] if scenario == "moved" else [0, 0])
            if scenario != "lost" else [None, 0]
        )
    basis_cases = [e["data"] for e in events[16:-1]]
    for e, case in zip(basis_cases, ("unchanged", "unrelated", "scope", "feed", "head", "function",
                                    "revision", "predicate", "retired", "journal", "history", "claim"), strict=True):
        assert e["mode"] == case and e["db"] == db(attempt, "basis-" + case)
        assert (e["observedBasis"] == e["basis"]) == (case in ("unchanged", "claim"))
        assert e["historyPath"] in ("range", "points")
        a, b = e["receipts"]
        assert b == e["replies"][1]["receipt"] and b["t"] > e["observedBasis"]
        assert e["replies"][1]["replays"] == int(case != "unchanged")
        assert (a is None) == (case in ("revision", "predicate", "retired", "history", "claim"))
        assert a is None or a["position"] == b["position"] - 1
    oracle = out / "oracle"
    for name in subprocess.check_output(["git", "ls-tree", "-r", "--name-only", ORACLE, "--", "lab/oracles/replay"],
                                        cwd=ROOT, text=True).splitlines():
        path = oracle / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(subprocess.check_output(["git", "show", f"{ORACLE}:{name}"], cwd=ROOT))
    verdicts = []
    for e in events[:4]:
        salt = e["data"]["salt"]
        for mode, suffix in (("reference", "false"), ("prepared", "true"), ("basis", "basis")):
            arm = e["data"][mode]
            assert arm["db"] == db(attempt, f"{salt}-{suffix}")
            case = oracle_case(arm)
            requested, observed = (out / f"{salt}-{mode}-{suffix}.json" for suffix in ("case", "answer"))
            save(requested, case)
            subprocess.run([sys.executable, "-I", oracle / "lab/oracles/replay/cli.py",
                            requested, "-o", observed], check=True)
            assert_oracle(json.loads(observed.read_text()), case, arm["snapshots"])
            verdicts.append({"salt": salt, "mode": mode, "inputs": digest(requested),
                             "answer": digest(observed), "receipts": len(case["receipts"]),
                             "cuts": len(case["queries"])})
    save(out / "verified.json", {"attempt": attempt, "slot": "fresh-in-process-datomic",
                               "source": manifest, "java": digest(java), "jars": {j.name: digest(j) for j in jars},
                               "oracle": ORACLE, "observations": digest(log), "runs": verdicts,
                               "windows": windows, "basis": basis_cases})


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Verification requires enabled assertions")
    run(*(Path(x).resolve() for x in sys.argv[1:]))
