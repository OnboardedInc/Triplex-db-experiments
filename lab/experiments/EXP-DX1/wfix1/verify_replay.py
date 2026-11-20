"""Compare the retained gateway feed and pinned reads with pinned O-REPLAY."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys


if not __debug__:
    raise RuntimeError("Run the verifier with assertions enabled")
parser = argparse.ArgumentParser()
parser.add_argument("log", type=Path)
parser.add_argument("binding", type=Path)
parser.add_argument("attempt")
parser.add_argument("output", type=Path)
args = parser.parse_args()
args.output.mkdir()
revision = "f195f30af618d3f9b0525a864e913824a315cc8c"
pin = Path("lab/acceptance/pins/O-REPLAY-0.4.9-SHA256SUMS")


def sha(content):
    return hashlib.sha256(content).hexdigest()


def save(name, value):
    path = args.output / name
    with path.open("x") as file:
        json.dump(value, file, indent=2)
        file.write("\n")
    return path


for line in pin.read_text().splitlines():
    digest, name = line.split(maxsplit=1)
    # The acceptance file manifest includes the later frozen HAM reference script.
    data = Path(name).read_bytes()
    assert sha(data) == digest
    target = args.output / "oracle" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def raw_journal(tx):
    tx_id, position, texts = tx
    columns = []
    for text in texts:
        head = 5 + int(text[1:5], 16)
        ref_size = int(text[head + 32:head + 36], 16)
        columns.append(json.loads(text[head + 37 + ref_size:]))
    fields = lambda attr, i: [row[i] for row in columns if row[3] == ":_tx/" + attr]
    assert fields("position", 0) == [str(position).zfill(16)]
    assert all(row[2] == tx_id and row[14] == "_Transaction" for row in columns)
    instant, = fields("instant", 8)
    command, = fields("command-id", 5)
    assert len(columns) == 3 + len(fields("changed-entity", 5)) + len(fields("change", 9))
    return dict(txId=tx_id, position=position, instant=instant, commandId=command,
                changedEntities=sorted(fields("changed-entity", 5)),
                changes=sorted((json.loads(text) for text in fields("change", 9)),
                               key=lambda change: (change["op"], change["tripleId"])))


def replay(observed, grouped, label):
    root = "acct/test/person"
    tape = [
        ("seed", "old", "old value", -9, 40),
        ("edit-a", "middle", "intermediate value", 2, 12),
        ("edit-b", "new", "final value", 3, None),
    ]
    commands, receipts, queries = [], [], []
    for i, (command, row_id, value, valid_from, valid_to) in enumerate(tape):
        operations = [{"op": "retract", "target": tape[i - 1][1]}] if i else []
        operations.append(dict(op="assert", ref=row_id, entityId=root, attribute=":v",
                               value=dict(type="string", value=value), validFrom=valid_from,
                               **({} if valid_to is None else {"validTo": valid_to})))
        commands.append(dict(kind="transact", clock=1000 + i, operations=operations,
                             meta=dict(commandId=command), physicalGroup="edits" if grouped and i else f"solo-{i}"))
        receipts.append(dict(command=i, outcome="committed", position=i + 1, instant=1000 + i,
                             txId="_tx/" + command, assertionIds=[None, row_id] if i else [row_id]))
        queries.append(dict(id=f"cut-{i + 1}", kind="entityTriples", entityId=root,
                            cut=dict(position=i + 1, validAt=5)))
    queries += [dict(id=f"feed-{after}", kind="transactions", after=after, limit=1) for after in range(3)]
    case = save(f"{label}-intent.json", dict(
        format="triplex-db-2/o-replay-case/1", caseId=f"write-{args.attempt}-{label}",
        defaultScope="scratch", adapter=dict(schemaVersion=1), commands=commands, receipts=receipts, queries=queries,
    ))
    answer = args.output / f"{label}-oracle.json"
    subprocess.run([sys.executable, "-I", args.output / "oracle/lab/oracles/replay/cli.py", case, "-o", answer], check=True)
    report = json.loads(answer.read_bytes())
    assert report["verdict"] == "PASS" and report["receiptConsistency"]["violations"] == []
    assert len(report["queries"]) == 6
    assert len(observed["cuts"]) == len(observed["rawFeed"]) == len(observed["receipts"]) == len(observed["operations"]) == 3
    fields = dict(id="id", entityId="entity_id", attribute="attribute", recordedAt="recorded_at",
                  validFrom="valid_from", validTo="valid_to", txId="tx_id", entityType="entity_type",
                  createdBy="created_by", retractedAt="retracted_at", retractTxId="retract_tx_id")
    for i, query in enumerate(report["queries"][:3]):
        expected, = query["result"]["snapshot"]
        row, = observed["cuts"][i]
        def tagged(key):
            return (row.get(key) or {}).get("v")
        assert {key: tagged(wire) for key, wire in fields.items()} == {key: expected[key] for key in fields}
        assert {"type": tagged("value_type"), "value": tagged("value_string")} == expected["value"]
        assert int(tagged("recorded_position")) == expected["recordedPosition"]
        assert int(tagged("schema_version")) == expected["schemaVersion"]
        assert tagged("retracted_position") is None
        command = tape[i][0]
        receipt = observed["operations"][i]
        assert observed["receipts"][i] == {"commandId": command, "txId": "_tx/" + command, "receipt": receipt}
        assert receipt["status"] == "committed" and receipt["operationId"] == command
        assert receipt["position"] == {"t": "long", "v": str(i + 1)}
        assert receipt["recordedAt"] == {"t": "double", "v": 1000 + i}
        assert receipt["t"]["t"] == "long" and int(receipt["t"]["v"]) > 0
    assert (observed["operations"][1]["t"] == observed["operations"][2]["t"]) is grouped
    for i, query in enumerate(report["queries"][3:]):
        want, = query["result"]["transactions"]
        want["changes"].sort(key=lambda item: (item["op"], item["tripleId"]))
        assert raw_journal(observed["rawFeed"][i]) == want
        if i == 2:
            resumed, = observed["rawResume"]
            assert raw_journal(resumed) == want
            assert resumed == observed["rawFeed"][i]
    return {"intent": sha(case.read_bytes()), "oracleAnswer": sha(answer.read_bytes()), "grouped": grouped}


raw = args.log.read_bytes()
binding = args.binding.read_bytes()
sql = args.binding.suffix == ".json"
if sql:
    inputs = json.loads(binding)
    assert inputs["attempt"] == args.attempt
    for name, digest in inputs["stage"].items():
        assert sha((args.binding.parent / "config" / name).read_bytes()) == digest
    terminal = json.loads((args.binding.parent / "selftest-terminal.json").read_bytes())
    assert terminal["slot"] == "tx2-datomic-selftest" and terminal["holder"] == "DX-WFIX1"
    assert terminal["attempt"] == args.attempt and terminal["log"] == args.log.name
    assert terminal["sha256"] == sha(raw) and terminal["image"].startswith("sha256:")
    source = inputs["git"]
else:
    assert (args.binding.parent / "attempt").read_text().strip() == args.attempt
    assert binding
    for line in binding.decode().splitlines():
        digest, name = line.split("  ", 1)
        assert sha((args.binding.parent / name).read_bytes()) == digest
    source = (args.binding.parent / "source").read_text().strip()
assert len(source) == 40
cases = []
modes = []
native_summary = []
sql_progress = []
for line in raw.splitlines():
    if line.startswith(b"WFIX1_REPLAY "):
        data = json.loads(line[len(b"WFIX1_REPLAY "):])
        assert data["attempt"] == args.attempt
        modes.append(data["mode"])
        cases.append(replay(data, data["mode"][0], f"native-{len(cases)}"))
    elif line.startswith(b"WFIX1_NATIVE "):
        native_summary.append(json.loads(line[len(b"WFIX1_NATIVE "):]))
    elif line.startswith(b"WFIX1_SQL "):
        event = json.loads(line[len(b"WFIX1_SQL "):])
        assert event["attempt"] == args.attempt
        sql_progress.append(event["event"])
        if event["event"] == "recovered":
            cases.append(replay(event["value"]["observed"], True, "sql"))
if sql:
    assert len(cases) == 1 and not modes and sql_progress[:4] == [
        "durability", "process-stop", "http-reopened", "recovered",
    ]
else:
    assert modes == [[False, False, False], [True, False, False], [True, True, True]]
    summary, = native_summary
    assert summary["attempt"] == args.attempt and summary["test"] == 7
    assert summary["fail"] == summary["error"] == 0
save("compared.json", dict(attempt=args.attempt, source=source, bindings=sha(binding),
                           raw=sha(raw), oracleSource=revision, oraclePin=sha(pin.read_bytes()),
                           verifier=sha(Path(__file__).read_bytes()), cases=cases))
