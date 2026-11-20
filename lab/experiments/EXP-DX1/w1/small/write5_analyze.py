"""Read a sealed Mac diagnostic attempt. Times are observations, not acceptance verdicts."""

import hashlib
import json
from pathlib import Path
import re
import statistics
import sys
from datetime import datetime, timezone

if not __debug__:
    raise RuntimeError("Diagnostic verification requires assertions")

out = Path(sys.argv[1]).resolve()
stage = out / "config"
terminal = json.loads((out / "terminal.json").read_text())
inputs = json.loads((out / "inputs.json").read_text())
raw = out / terminal["log"]
sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
assert terminal["exit"] == 0 and terminal["holder"] == "DX-W1" and terminal["slot"] == "tx2-datomic-selftest"
assert sha(raw) == terminal["sha256"]
assert re.fullmatch("[a-f0-9]{40}", inputs["head"])
for file, digest in inputs["stage"].items():
    if file != "lab/config/slots.json":
        assert sha(stage / file) == digest, file
slot = json.loads((stage / "lab/config/slots.json").read_text())["lanes"]["datomic"]
build = json.loads((out / "build-1.log").read_text().split("Successfully tagged")[-1].split("\n", 1)[1])
assert slot["imageId"] == build["imageId"] == terminal["image"]
assert slot["buildInputsSha256"] == build["buildInputsSha256"]
receipt = json.loads(Path(build["receipt"]).read_text())
assert receipt["imageId"] == slot["imageId"]
assert receipt["sources"]["sha256"] == slot["sourceInputsSha256"]
for component, root in (("gateway", "packages/datomic/gateway"), ("config", "lab/config/datomic")):
    for item in receipt["sources"][component]:
        assert inputs["stage"][root + "/" + item["path"]] == item["sha256"]
nonce = (stage / "lab/config/datomic/attempt").read_text().strip()
lines = raw.read_text().splitlines()
events = [json.loads(x[8:]) for x in lines if x.startswith("W1_DATA ")]
assert events[0]["v"] == [[k, "on"] for k in ("fsync", "synchronous_commit", "full_page_writes")]
assert all(e["nonce"] == nonce for e in events)
assert events[-1] == {"nonce": nonce, "k": "finished", "v": {"nonce": nonce}}
study = (stage / "lab/config/datomic/field-study").read_text()


def p50(values):
    return statistics.median(values) if values else None


def retention():
    observed = [json.loads(x[9:]) for x in lines if x.startswith("W1_SMALL ")]
    assert all(r["attempt"] == nonce for r in observed)
    n = int((stage / "lab/config/datomic/offers").read_text())
    points = [e["v"] for e in events if e["k"] == "storage"]
    assert len({p["sql"]["cluster"] for p in points}) == 1
    phases = ["seed", "acked", "written", "indexed", "gc", "observed-gc", "rewritten"]
    matched_gc = any(x["phase"] == "seed-gc" for x in points)
    if matched_gc:
        phases = ["seed-gc", "observed-seed-gc"] + phases
    table = []
    for arm, counts in {"classic": (23, 27, 31), "rows": (23, 27, 31), "ledger": (16, 20, 24), "packed": (14, 16, 18)}.items():
        ps = [r for r in points if r["arm"] == arm]
        assert [r["phase"] for r in ps] == phases
        seed, ack, tail, index, _, gc, rewritten = ps[-7:]
        source, written, adopted = [r["native"] for r in (seed, tail, index)]
        assert source["seed-facts"] == 512 * 160 and source["subjects"] == 512
        assert ack["native"]["saves"] == written["saves"] == n
        assert 0 < source["t"] == source["indexedT"] < written["t"] == adopted["t"] == adopted["indexedT"]
        assert written["position"] == adopted["position"] == source["position"] + n
        assert written["history"] == adopted["history"] == source["history"] + written["log-datoms"]
        assert 0 < source["indexSegments"] <= adopted["indexSegments"]
        (done,) = [r["data"] for r in observed if r["kind"] == "retention-done" and r["data"]["arm"] == arm]
        assert done["saves"] == n and done["t"] == adopted["t"] and done["history"] == adopted["history"]
        assert done["witness-sha256"] == gc["native"]["witness-sha256"]
        assert re.fullmatch("[a-f0-9]{64}", done["ack-sha256"])
        shapes = sorted([r["data"] for r in observed if r["kind"] == "retention-shape" and r["data"]["arm"] == arm],
                        key=lambda s: s["width"])
        assert [r["width"] for r in shapes] == [1, 2, 3]
        for i, (sample, count) in enumerate(zip(shapes, counts), 1):
            assert source["t"] < sample["t"] <= written["t"]
            assert sample["op"] == "correction-" + str(sample["p"] - source["position"])
            assert len(sample["data"]) == count, (arm, i, len(sample["data"]))
            f = done["widths"][str(i)]
            expected = sum((serial % 512) % 3 + 1 == i for serial in range(n))
            first = int(arm == "packed" and i == 1)
            assert f["count"] == expected
            assert f["datoms"] == {str(count): expected - first, **({str(count + 1): 1} if first else {})}
        assert n == sum(r["count"] for r in done["widths"].values())
        (timings,) = [r["data"] for r in observed if r["kind"] == "retention-read-cost" and r["data"]["arm"] == arm]
        for key in ("feed-32", "pinned-160"):
            assert len(timings[key]) == 24 and all(us > 0 and size > 0 for us, size in timings[key])
        pg = lambda r, k: r["sql"][k]
        state = lambda r: {k: (pg(r, k) - pg(seed, k)) / n for k in ("relationBytes", "kvBytes", "packedKvBytes", "keys")}
        for stage_name in (("seed-gc", "gc") if matched_gc else ("gc",)):
            samples = [e["v"] for e in events if e["k"] == "gc-observation" and e["v"]["arm"] == arm
                       and e["v"].get("phase", "gc") == stage_name]
            assert samples and samples[-1]["stable"] >= 6
        assert gc["native"]["t"] == adopted["t"] and pg(gc, "keys") == pg(rewritten, "keys")
        retained = written["log-datoms"] / n
        table.append({
            "arm": arm, "saves": n, "savesPerSecond": 1000 * n / written["duration-ms"], "seedGc": matched_gc,
            "retainedDatomsPerSave": retained, "currentDatomsPerSave": (adopted["current"] - source["current"]) / n,
            "indexSegmentsAdded": adopted["indexSegments"] - source["indexSegments"],
            "walInsertBytesPerSave": (pg(ack, "insertLsn") - pg(seed, "insertLsn")) / n,
            "walCounterBytesPerSave": (pg(ack, "walBytes") - pg(seed, "walBytes")) / n,
            "sinceSeedPerSave": {entry["phase"]: state(entry) for entry in (ack, index, gc, rewritten)},
            "valueBytesByWidth": [sum(v["valueBytes"] for v in s["data"]) for s in shapes],
            "tupleBytesByWidth": [sum(v["ednBytes"] for v in s["data"]) for s in shapes],
            "feed32MedianMicros": p50([x[0] for x in timings["feed-32"][3:]]),
            "pin160MedianMicros": p50([x[0] for x in timings["pinned-160"][3:]]),
            "daysToEightBAt50PerSecond": (8e9 - 480e6) / (86400 * 50 * retained),
        })
    return table


def clocks():
    def instant(s):
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp() * 1000

    append = {}
    peer_start = {}
    peers = {}
    replies = {}
    arm_index = 0
    for x in lines:
        if x.startswith("W1_DATA "):
            event = json.loads(x[8:])
            if event["k"] == "capacity":
                assert event["v"]["arm"] == arm_index
                arm_index += 1
        if x.startswith("W1_REPLY "):
            t, members, received, lookup, fanout = map(int, x.split()[1:])
            assert (arm_index, t) not in replies
            replies[(arm_index, t)] = (members, received, lookup, fanout)
        if x.startswith("W1_NATIVE "):
            _, role, at, logger, msg = x.split(maxsplit=4)
            at = instant(at)
            first = re.search(r":firstT (\d+)", msg)
            msec = re.search(r":msec (\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)", msg)
            ids = re.findall(r'#uuid "([a-f0-9-]+)"', msg)
            if role == "transactor" and ":log/add-next" in msg and ":phase :end" in msg and first and msec:
                if len(ids) == 1:
                    append.setdefault((arm_index, int(first[1])), []).append((at, float(msec[1]), ids[0]))
            if role.startswith("gateway-") and ":peer/accept-new" in msg and len(ids) == 1:
                if ":phase :begin" in msg:
                    peer_start[(role, ids[0])] = at
                if ":phase :end" in msg and msec:
                    peers[(role, ids[0])] = (at, float(msec[1]))
    pauses = {}
    for evt in (e["v"] for e in events if e["k"] == "gc-log"):
        pauses[evt["role"]] = []
        for x in evt["data"].splitlines():
            match = re.search(r"^\[([^]]+)\].*Pause.*?([0-9.]+)ms$", x)
            if match:
                end = datetime.fromisoformat(match[1]).timestamp() * 1000
                pauses[evt["role"]].append((end - float(match[2]), end))
    arms = [e["v"] for e in events if e["k"] == "capacity"]
    assert [(r["arm"], r["treatment"]) for r in arms] == list(enumerate([False, True, True, False]))
    table = []
    for arm in arms:
        assert arm["nonce"] == nonce + "-capacity-" + str(arm["arm"])
        role = "gateway-" + str(arm["arm"])
        assert [p["depth"] for p in arm["phases"]] == [64, 128]
        for phase in arm["phases"]:
            rows = phase["rows"]
            assert len(rows) == 384 and len({r["id"] for r in rows}) == len(rows)
            members = {}
            for r in rows:
                members.setdefault(int(r["t"]), []).append(r)
            joined = []
            for t, batch in members.items():
                assert all(r["group"] == len(batch) for r in batch)
                if len(batch) == 1:
                    continue
                key = (arm["arm"], t)
                n, received, lookup, whole = replies[key]
                assert n == len(batch) and whole >= lookup >= 0
                candidates = [e for e in append.get(key, []) if 0 <= received - e[0] <= 5000]
                matched = [e for e in candidates if (role, e[2]) in peers]
                tx = matched[0] if len(matched) == 1 else None
                peer = peers.get((role, tx[2])) if tx else None
                peer_begin = peer_start.get((role, tx[2])) if tx else None
                overlap = lambda who, lo, hi: sum(max(0, min(end, hi) - max(begin, lo)) for begin, end in pauses.get(who, []))
                joined.append({"t": t, "members": n, "lookupUs": lookup, "fanoutUs": whole,
                               "logMs": tx[1] if tx else None,
                               "logToPeerFutureMs": received - tx[0] if tx else None,
                               "logToPeerReceiptMs": peer_begin - tx[0] if tx and peer_begin else None,
                               "peerApplyMs": peer[1] if peer else None,
                               "gatewayGcMs": overlap(role, tx[0], received) if tx else None,
                               "logGcMs": overlap("transactor", tx[0] - tx[1], tx[0]) if tx else None})
            clocks = {k: p50([r[k] for r in joined if r[k] is not None])
                      for k in ("lookupUs", "fanoutUs", "logMs", "logToPeerFutureMs", "logToPeerReceiptMs",
                                "peerApplyMs", "gatewayGcMs", "logGcMs")}
            table.append({"arm": arm["arm"], "treatment": arm["treatment"], "depth": phase["depth"],
                          "groupedTx": len(joined), "logMatches": sum(j["logMs"] is not None for j in joined),
                          "peerMatches": sum(j["peerApplyMs"] is not None for j in joined),
                          "largest": max(map(len, members.values())), "bytesPerHttp": p50([r["bytes"] for r in rows]),
                          "savesPerSecond": 1000 * len(rows) / phase["durationMs"],
                          **clocks, "joined": joined})
    return table


result = {"attempt": nonce, "slot": terminal["slot"], "image": terminal["image"], "raw": sha(raw),
          "inputs": sha(out / "inputs.json"), "analyzer": sha(Path(__file__)), "study": study,
          "measurements": {"retention": retention, "write-clock": clocks}[study]()}
with (out / "diagnostic-summary.json").open("x") as f:
    json.dump(result, f, indent=2)
    f.write("\n")
