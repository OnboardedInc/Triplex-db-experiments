"""Bind per-lookup SQL samples to durable edits in the managed fixture."""

from collections import Counter, defaultdict
import json
from pathlib import Path
import sys

from read_guard import scoped_db
from read_probe import managed_events


def io(section, key):
    return (section.get("reads") or {}).get(key, 0)


indexes = ("aevt-load", "avet-load", "eavt-load", "vaet-load")


def extract(out):
    inputs, terminal, events = managed_events(out)
    assert inputs["mode"] == "lookup-profile" and inputs["timings"] == "diagnostic"
    assert not inputs["numericOwner"]
    attempt = inputs["attempt"]
    probes = defaultdict(list)
    for event in events("PREP1_PROBE "):
        probes[event["arm"]].append(event)
    assert list(probes) == ["A1", "B1"]
    native = {}
    for block in events("PREP1_NATIVE "):
        assert len(block["bytes"]) == len(block["members"])
        for member in block["members"]:
            key = (block["db"], str(member["t"]))
            assert key not in native
            native[key] = (member, block)
    profiles = defaultdict(list)
    for row in events("PREP1_LOOKUPS "):
        profiles[row["t"]].append(row)
    cpu = events("PREP1_CPU ")
    result = {}
    for arm, kind in [("A1", "K"), ("B1", "S")]:
        observed, seed, idle, block, finish = probes[arm]
        assert [row["kind"] for row in probes[arm]] == ["writers", "seed", "idle", "block", "finished"]
        scope, db = scoped_db(attempt, arm)
        seed, block = seed["data"], block["data"]
        [writer] = observed["data"]
        assert [seed["scope"], seed["db"], seed["subjects"], seed["facts"], seed["position"]] == [
            scope, db, 1152, 184320, 144]
        assert writer["database"] == db and writer["position"] == 144
        assert writer["options"]["groupCommit"] == (kind == "K")
        assert bool(writer.get("subjectSave")) == (kind == "S")
        assert idle["data"]["db"] == db and int(idle["data"]["elapsedNs"]) >= 8_000_000_000
        assert (block["db"], block["head"], block["outstanding"]) == (db, 144, 24)
        assert finish["data"] == {"db": db, "head": 240}
        receipts = defaultdict(list)
        assert {row["index"] for row in block["rows"]} == set(range(96))
        assert len(block["rows"]) == 96
        for i, row in enumerate(block["rows"]):
            ack = row["ack"]
            assert ack["operationId"] == f"edit-{row['index']}"
            assert int(ack["position"]["v"]) == 145 + i
            assert not ack.get("subjectReplan")
            assert ack.get("subjectSave") == writer.get("subjectFunction")
            receipts[(db, ack["t"]["v"])].append(row)

        summary = defaultdict(lambda: {"calls": 0, "wallNs": 0, "sql": 0,
                                       "sqlMs": 0, "decodeMs": 0, "indexLoads": Counter()})
        total = {"saves": 0, "tx": 0, "wallNs": 0, "sql": 0, "sqlReported": 0}
        total["indexLoads"] = Counter()
        outside_sql = Counter()
        exact_profiles = []
        # [DX-PREP1] Why: select the actual K or S function at the bound native t.
        # Rejected: counting a K singleton on the ordinary reference path as a grouped apply.
        for key, rows in receipts.items():
            member, append = native[key]
            for row in rows:
                assert int(row["begin"]) <= member["started-at"] <= member["applied-at"]
                assert member["applied-at"] <= append["start"] <= append["end"] <= int(row["end"])
                assert row["ack"]["datoms"] == member["datom-count"]
            if kind == "K" and len(rows) == 1:
                continue
            assert len(rows) == 1 or kind == "K"
            [profile] = [p for p in profiles[key[1]]
                         if member["started-at"] <= p["start"] <= p["end"] <= member["applied-at"]]
            exact_profiles.append(profile)
            total["saves"] += len(rows)
            total["tx"] += 1
            total["wallNs"] += profile["end"] - profile["start"]
            reported = rows[0]["ack"].get("nativeIoStats")
            assert reported and all(row["ack"]["nativeIoStats"] == reported for row in rows)
            native_sql = io(profile["io"], "sql")
            if profile["lookupCount"] > profile.get("lookupLimit", 128):
                total["cappedTransactions"] = total.get("cappedTransactions", 0) + 1
            outside_sql.update(profile.get("outsideSql", {}))
            total["sql"] += native_sql
            total["sqlReported"] += io(reported, "sql")
            total["indexLoads"].update({index: io(profile["io"], index) for index in indexes})
            attributed = 0
            for name, record in profile["lookups"].items():
                section = summary[name]
                section["calls"] += record["calls"]
                section["wallNs"] += record["wallNs"]
                section["sql"] += io(record, "sql")
                section["sqlMs"] += io(record, "sql-ms")
                section["decodeMs"] += io(record, "deserialize-ms")
                section["indexLoads"].update({index: io(record, index) for index in indexes})
                attributed += io(record, "sql")
            assert attributed <= native_sql, (kind, key, attributed, native_sql)
        assert total["saves"] >= (96 if kind == "S" else 64)
        window = [p["pressure"]["some"] for p in cpu
                  if min(r["start"] for r in exact_profiles) <= p["at"] <= max(r["end"] for r in exact_profiles)]
        result[kind] = {"offered": 96, "total": total, "sections": dict(sorted(summary.items())),
                        "outsideSql": dict(outside_sql.most_common()),
                        "cpuPressure": window}
    return {"attempt": attempt, "head": inputs["head"], "image": terminal["image"],
            "logSha256": terminal["sha256"], "status": "diagnostic", "arms": result}


if __name__ == "__main__":
    print(json.dumps(extract(Path(sys.argv[1])), indent=2))
