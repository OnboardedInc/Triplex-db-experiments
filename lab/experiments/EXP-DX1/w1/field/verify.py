"""Recount a sealed W1 managed measurement from its exact build and workload."""
import base64
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

if not __debug__:
    raise RuntimeError("Evidence verification requires enabled assertions")


def filehash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def db_name(nonce, kind):
    scope = ["triplex-scope-v1", "test", kind, nonce, 0]
    return "s2-" + base64.urlsafe_b64encode(json.dumps(scope, separators=(",", ":")).encode()).decode().rstrip("=")


def load(out):
    stage = out / "config"
    cfg = stage / "lab/config/datomic"
    terminal = read(out / "terminal.json")
    assert (terminal["exit"], terminal["slot"], terminal["holder"]) == (0, "tx2-datomic-selftest", "DX-W1")
    assert Path(terminal["log"]).name == terminal["log"]
    raw = out / terminal["log"]
    assert filehash(raw) == terminal["sha256"]
    inputs = read(out / "inputs.json")
    for rel, digest in inputs["stage"].items():
        if rel != "lab/config/slots.json":
            assert filehash(stage / rel) == digest, rel
    slot = read(stage / "lab/config/slots.json")["lanes"]["datomic"]
    build = json.loads((out / "build-1.log").read_text().rsplit("Successfully tagged", 1)[1].split("\n", 1)[1])
    receipt = Path(build["receipt"])
    built = read(receipt)
    assert build["imageId"] == built["imageId"] == slot["imageId"] == terminal["image"]
    assert build["buildInputsSha256"] == built["buildInputsSha256"] == slot["buildInputsSha256"]
    assert built["sources"]["sha256"] == slot["sourceInputsSha256"]
    for kind, root in [("gateway", "packages/datomic/gateway"), ("config", "lab/config/datomic")]:
        for entry in built["sources"][kind]:
            assert entry["sha256"] == inputs["stage"][root + "/" + entry["path"]]
    nonce = (cfg / "attempt").read_text().strip()
    lines = raw.read_text().splitlines()
    events = [json.loads(line[8:]) for line in lines if line.startswith("W1_DATA ")]
    assert all(e["nonce"] == nonce for e in events)
    assert events[0]["v"] == [[k, "on"] for k in ("fsync", "synchronous_commit", "full_page_writes")]
    assert events[-1] == {"k": "finished", "nonce": nonce, "v": {"nonce": nonce}}
    stages = {key: filehash(out / key) for key in ("terminal.json", "inputs.json", "build-1.log")}
    binding = {"nonce": nonce, "image": terminal["image"], "slot": terminal["slot"],
               "raw": terminal["sha256"], "buildReceipt": filehash(receipt), **stages}
    return nonce, lines, events, (cfg / "field-study").read_text(), inputs["runner"], binding


def percentile(values, q):
    return sorted(values)[math.ceil(len(values) * q) - 1]


def physical(rows, head):
    assert len(set(r["id"] for r in rows)) == len(rows)
    ordered = sorted(rows, key=lambda r: r["p"])
    batches = defaultdict(list)
    previous = -math.inf
    for i, row in enumerate(ordered, head + 1):
        assert row["p"] == i and row["clock"] > previous
        assert 0 <= row["due"] < row["end"] and 0 <= row["hand"] <= row["end"] and int(row["t"]) > 0
        assert row["bytes"] > 0 and row["ops"] > 0
        assert min(row[k] for k in ("prepareMs", "awaitMs", "gatewayQueueMs", "nativeEntryMs")) >= 0
        previous = row["clock"]
        batches[row["t"]].append(row)
    same = 0
    for g in batches.values():
        assert 1 <= len(g) <= 8
        assert all(r["size"] == len(g) and r["p"] == g[0]["p"] + i for i, r in enumerate(g))
        same += len(g) - len({(r["account"], r["person"]) for r in g})
    return dict(native=len(batches), sameSubjectShared=same, logical=len(rows))


def queue(nonce, events, sources):
    assert [e["k"] for e in events] == ["sql", *["queue"] * 4, *["fields"] * 4, "finished"]
    schedule = Path(__file__).resolve().with_name("schedule.ts").relative_to(Path.cwd())
    assert filehash(schedule) == sources[str(schedule)]
    expected = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e",
         f"import {{offers,rates,sha}} from {json.dumps('./' + str(schedule))};"
         "console.log(JSON.stringify(rates.map(r=>{const s=offers(r,12,[0]); return [sha(s),s]})))"],
        text=True,
    ))
    metrics = []
    fields = []
    for index, enabled in enumerate((False, True, True, False)):
        q, f = events[1 + index]["v"], events[5 + index]["v"]
        assert (q["nonce"], q["db"], q["priority"]) == (f"{nonce}-{index}", db_name(f"{nonce}-{index}", "field"), enabled)
        assert (f["nonce"], f["db"], f["only"]) == (f"{nonce}-f{index}", db_name(f"{nonce}-f{index}", "field"), enabled)
        assert [s["width"] for s in q["samples"]] == [8, 32, 80, 80, 32, 8]
        for i, sample in enumerate(q["samples"]):
            rows = sample["rows"]
            assert [(r["id"], r["person"], r["account"]) for r in rows] == [
                (f"q{i * 10 + j}", i * 10 + j, j % 3 if j < 8 else 9) for j in range(10)]
            counted = physical(rows, i * 10)
            assert counted == sample["receipt"]
            if enabled:
                assert all(r["size"] == 1 for r in rows[:8])
            metrics.append({
                "arm": index, "priority": enabled, "width": sample["width"], **counted,
                "bulkBytes": sum(r["bytes"] for r in rows[:8]), "liveBytes": sum(r["bytes"] for r in rows[8:]),
                "livePositions": [r["p"] - i * 10 for r in rows[8:]],
                "live": [{**{k: r[k] for k in
                              ("prepareMs", "gatewayQueueMs", "nativeEntryMs", "readyToNativeMs", "awaitMs")},
                           "ackMs": r["end"] - r["due"]} for r in rows[8:]],
            })
        assert [p["label"] for p in f["phases"]] == ["r35", "r235", "r394"]
        head = 0
        for phase, (digest, offers) in zip(f["phases"], expected, strict=True):
            rows = phase["rows"]
            assert phase["headBefore"] == head and phase["scheduleSha256"] == digest
            assert phase["offered"] == len(rows) == len(offers) and phase["failures"] == []
            by_id = {r["id"]: r for r in rows}
            for e in offers:
                row = by_id[f'{phase["label"]}-{e["account"]}-{e["person"]}-{e["ordinal"]}']
                assert (row["account"], row["person"], row["due"]) == (e["account"], e["person"], e["ms"])
            counted = physical(rows, head)
            assert counted == phase["counts"]
            assert counted["logical"] - counted["native"] == (counted["sameSubjectShared"] if enabled else 0)
            assert phase["p99Ms"] == percentile([r["end"] - r["due"] for r in rows], .99)
            fields.append({"arm": index, "subjectOnly": enabled, "label": phase["label"], **counted,
                           "p99Ms": phase["p99Ms"], "peakBacklog": phase["peakBacklog"],
                           "bytes": sum(r["bytes"] for r in rows)})
            head += len(rows)
    return {"queue": metrics, "fields": fields}


def growth(nonce, events, lines):
    assert [e["k"] for e in events] == ["sql", "grant", "seedStorage", "finished"]
    grant = events[1]["v"]
    subjects, facts = grant["subjects"], grant["facts"]
    assert (subjects, facts) in {(100000, 3848930), (100000, 800000), (32000, 256000)}
    disk = events[2]["v"]
    database_bytes = int(disk["databaseBytes"] if isinstance(disk, dict) else disk)
    assert database_bytes > 0
    data = defaultdict(list)
    db = db_name(nonce, "field-probe")
    for line in lines:
        if line.startswith("W1_FIELD "):
            row = json.loads(line[9:])
            assert row["attempt"] == nonce and row["data"].get("db", db) == db
            data[row["kind"]].append(row["data"])
    assert set(data) == {"seed-progress", "seed", "same-basis", "correction", "growth-done"}
    seed, = data["seed"]
    done, = data["growth-done"]
    assert seed["subjects"] == done["subjects"] == subjects and seed["facts"] == done["seedFacts"] == facts
    assert seed["encodedBytes"] > 0 and seed["commits"] > 0
    assert [(r["iteration"], r["basis"]) for r in data["same-basis"]] == [(0, seed["t"]), (1, seed["t"])]
    order = [(False, False), (False, True), (True, False), (True, True),
             (True, True), (True, False), (False, True), (False, False)]
    n = min(160, subjects // 8)
    rows = data["correction"]
    assert done["commits"] == len(rows) == 16 * n
    assert done["head"] == seed["commits"] + len(rows)
    cells = defaultdict(list)
    prior = seed["t"]
    for idx, row in enumerate(rows):
        b, offset = divmod(idx, 2 * n)
        p, j = divmod(offset, n)
        width = 1 + j % 3
        assert (row["block"], row["pass"], row["index"], row["width"]) == (b, p, j, width)
        assert row["subject"] == ((j * 8 + b) * 7919 + 117) % subjects
        assert (row["optimized"], row["range"]) == order[b]
        assert row["position"] == seed["commits"] + idx + 1 and row["op"] == f"correction-{idx+1}"
        assert row["t"] > prior and row["bytes"] > 0 and row["nativeMicros"] > 0
        prior = row["t"]
        io = row["io"]
        assert io["api"] == "tx-with" and io["io-context"] == "commit"
        fun = io["nested"]["function"]
        parts = fun["nested"]
        assert set(parts) <= {"old-live", "retirement", "new-id", "new-range", "retract", "owner", "revision"}
        get = lambda kind: parts.get(kind, {}).get("reads", {})
        assert get("old-live")["w1-calls"] == width + int(row["optimized"])
        assert get("retirement")["w1-calls"] == width
        assert get("owner").get("w1-calls", 0) == int(row["optimized"])
        if row["range"]:
            assert get("new-range")["w1-calls"] == 1
        else:
            assert not get("new-range") and get("new-id")["w1-calls"] == width + 4
        assert get("retract").get("w1-calls", 0) == (0 if row["optimized"] else width)
        count = lambda s: s["reads"].get("sql", 0)
        total, inside = count(io), count(fun)
        children = sum(count(v) for v in parts.values())
        assert 0 <= children <= inside <= total
        categories = Counter({k: count(v) for k, v in parts.items()})
        categories["total"] = total
        categories["functionOther"] = inside - children
        categories["nativeOutsideFunction"] = total - inside
        cells[order[b]].append((row, categories))
    summary = []
    for opts, observations in cells.items():
        totals = Counter()
        for _, counts in observations:
            totals.update(counts)
        points = [r for r, _ in observations]
        native = [r["io"]["api-ms"] for r in points]
        fn = [r["io"]["nested"]["function"]["api-ms"] for r in points]
        add_ms = [r["nativeMicros"] / 1000 for r in points]
        summary.append({"optimized": opts[0], "range": opts[1], "count": len(points), "sql": dict(totals),
                        "payloadBytes": sum(r["bytes"] for r in points), "datoms": sum(r["datoms"] for r in points),
                        "nativeMs": [percentile(native, q) for q in (.50, .99)],
                        "functionMs": [percentile(fn, q) for q in (.50, .99)],
                        "awaitMs": [percentile(add_ms, q) for q in (.50, .99)]})
    return {"reservation": grant, "seed": seed, "databaseBytes": database_bytes,
            "sameBasisSQL": [r["io"]["reads"].get("sql", 0) for r in data["same-basis"]], "cells": summary}


if __name__ == "__main__":
    out, destination = map(Path, sys.argv[1:])
    nonce, lines, events, study, sources, binding = load(out)
    assert study in ("queue", "growth")
    data = queue(nonce, events, sources) if study == "queue" else growth(nonce, events, lines)
    with destination.open("x") as output:
        json.dump({"binding": binding, "verifier": filehash(Path(__file__)), **data}, output, indent=2)
        output.write("\n")
