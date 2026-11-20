"""Recount the paired live windows from the bound native and client observations."""

import base64
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
from statistics import median
import sys

from read_probe import managed_events, sha


def read_live(out):
    inputs, terminal, events = managed_events(out)
    attempt = inputs["attempt"]
    assert inputs["mode"] == (out / "stage/lab/config/datomic/mode").read_text().strip() == "live"
    duration_path = out / "stage/lab/config/datomic/seconds"
    seconds = int(duration_path.read_text()) if duration_path.exists() else 10
    rate_rows = events("PREP1_LIVE ")
    native = {}
    for append in events("PREP1_NATIVE "):
        for member in append["members"]:
            key = append["db"], str(member["t"])
            assert key not in native
            read, started, applied = (member[k] for k in ("read-at", "started-at", "applied-at"))
            assert read <= started <= applied <= append["start"] <= append["end"]
            native[key] = (read, started, applied, append["start"], append["end"])
    results, digests = [], {}
    for number, r in enumerate(rate_rows):
        arm, block = divmod(number, 3)
        rate = (50, 235, 394)[block]
        variant = "reference" if arm in (0, 3) else "prepare"
        assert (r["arm"], r["rate"], r["seconds"], r["pendingPeakAllowed"]) == (arm, rate, seconds, 96)
        scope = json.dumps(["triplex-scope-v1", "test", "prep1-live", f"{attempt}-{arm}", 0], separators=(",", ":"))
        db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
        assert db == r["db"]
        assert digests.setdefault(rate, r["tapeSha256"]) == r["tapeSha256"]
        records = r["records"]
        total = rate * seconds
        assert len(records) == r["offers"] == total
        by_id = {item["id"]: item for item in records}
        assert set(by_id) == {f"live-{block}-{account}-{i}" for account in range(10)
                              for i in range(total // 10 + int(account < total % 10))}
        assert Counter(x["outcome"] for x in records) == r["outcomes"]
        start = int(r["startNs"])
        durable = []
        groups = defaultdict(list)
        tries = {}
        latencies = []
        missed_window = 0
        for item in records:
            assert int(item["id"].split("-")[2]) == item["account"]
            assert 0 <= item["due"] <= item["sent"] <= item["end"] <= r["drained"]
            ack = item.get("result")
            recovered = item.get("recovered")
            assert (item["outcome"] == "acked") == bool(ack)
            if ack:
                latencies.append(item["end"] - item["due"])
                missed_window += int(item["end"] > 1000 * seconds)
                if duration_path.exists():
                    assert ack["writerFunction"].startswith(":triplex.write/v-")
            receipt = ack or recovered
            if not receipt:
                continue
            assert receipt["operationId"] == item["id"]
            read, _, _, _, written = native[db, receipt["t"]["v"]]
            assert start + int(item["sent"] * 1e6) <= read <= written
            if ack:
                assert written <= start + int(item["end"] * 1e6)
            durable.append(receipt)
            groups[receipt["t"]["v"]].append(receipt)
            if stats := receipt.get("preparedStats"):
                assert variant == "prepare"
                sent = stats["submittedNs"]
                assert tries.setdefault(sent, stats) == stats
        full_groups = defaultdict(list)
        for t, members in groups.items():
            assert all(m.get("groupSize", len(members)) == len(members) for m in members)
            if len(members) == 8:
                _, started, applied, appending, appended = native[db, t]
                paths = {m["preparedStats"]["path"] for m in members if m.get("preparedStats")}
                assert len(paths) <= 1
                full_groups[next(iter(paths), "reference")].append((applied - started, appended - appending))
        positions = sorted(int(x["position"]["v"]) for x in durable)
        assert positions == list(range(r["positionBefore"] + 1, r["positionBefore"] + 1 + len(durable)))
        latencies.sort()
        p99 = latencies[math.ceil(len(latencies) * .99) - 1] if latencies else None
        goodput = (len(latencies) - missed_window) / seconds
        assert r["afterDrain"] == len(durable) and r["recovered"] == len(durable) - len(latencies)
        assert r["inWindowPerSecond"] == goodput and r["p99CompletedMs"] == p99
        late = len(records) - len(latencies) + sum(ms > 50 for ms in latencies)
        assert r["beyond50msOrMissing"] == late
        results.append({
            "arm": arm, "variant": variant, "rate": rate, "offered": len(records), "inWindowPerSecond": goodput,
            "completedP99Ms": p99, "lateOrMissing50ms": late, "durableAfterDrain": len(durable),
            "outcomes": r["outcomes"], "physical": len(groups),
            "preparedAttempts": len(tries), "preparedGroups": sum(x["path"] == "prepared" for x in tries.values()),
            "definitiveReplays": sum(x["replays"] for x in tries.values()),
            "fullGroups": {path: {"count": len(samples),
                                  "medianApplyMs": median(x[0] for x in samples) / 1e6,
                                  "medianAppendMs": median(x[1] for x in samples) / 1e6}
                           for path, samples in full_groups.items()},
        })
    assert len(results) == 12
    return {"attempt": attempt, "source": inputs["head"], "image": terminal["image"], "slot": terminal["slot"], "seconds": seconds,
            "inputSha256": sha(out / "inputs.json"), "rawSha256": terminal["sha256"], "verifierSha256": sha(Path(__file__)),
            "offerTapeDigests": digests, "windows": results}


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Verification requires enabled assertions")
    directory = Path(sys.argv[1])
    result = read_live(directory)
    name = sys.argv[2] if len(sys.argv) > 2 else "live-summary.json"
    with (directory / name).open("x") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
