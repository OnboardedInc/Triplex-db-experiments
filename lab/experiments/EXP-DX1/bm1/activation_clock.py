"""Recompute the audited activation clocks from the producer's sealed offer and read files."""

from bisect import bisect_right
from collections import defaultdict
import base64
import gzip
import hashlib
import json
import math
import re

from producer_readings import digest, get, nearest


ROUTES = {"public", "fresh-process"}


def clock_rows(offers, raw, mode):
    # [DX-BM1] Why: score every offer on its scheduled clock and use the native cut on each returned read.
    # Rejected: using the ACK as the deadline origin or ignoring a route that never returned.
    deadlines = [o["scheduled"] + 1000 for o in offers]
    cuts = [0]
    first = defaultdict(list)
    seen = defaultdict(set)
    for o in offers:
        cuts.append(max(cuts[-1], (o.get("ack") or {}).get("position", 0)))
    stale, count = 0, 0
    for r in raw:
        count += 1
        assert r["route"] in ROUTES and r["phase"] in ("deadline", "first", "traffic")
        assert math.isfinite(r["invoked"]) and math.isfinite(r["returned"]) and r["returned"] >= r["invoked"]
        assert r["position"] > 0 and r["seq"] >= 0 and r["raw"]
        if r["phase"] != "traffic":
            i = r["offer"] - offers[0]["order"]
            assert 0 <= i < len(offers)
            o = offers[i]
            ack = o.get("ack")
            current = ack and r["position"] >= ack["position"] and r["seq"] >= ack["seq"]
            if r["phase"] == "deadline":
                assert r["invoked"] >= deadlines[i]
                seen[i].add(r["route"])
                stale += not current
                continue
            if current and r["invoked"] >= o["ingress"]:
                first[i].append(r["returned"])
        stale += r["position"] < cuts[bisect_right(deadlines, r["invoked"])]
    rows = []
    for i, o in enumerate(offers):
        assert seen[i] == ROUTES
        ack, owed, stored = (o.get(key) for key in ("ack", "owed", "stored"))
        required = [ack, owed] + ([stored] if mode == "stored" else [])
        for cut in filter(None, required):
            assert math.isfinite(cut["at"]) and cut["at"] >= o["ingress"]
            assert cut["position"] >= (ack or {}).get("position", 0)
        if mode == "record" and ack and owed:
            assert owed == {key: ack[key] for key in ("at", "position")}
        read = min(first[i]) if first[i] else None
        start = o["scheduled"]
        done = None if o.get("error") or read is None or not all(required) else max([read] + [cut["at"] for cut in required]) - start
        rows.append({"id": o["id"], "firstReadMs": read - start if read is not None else None,
                     "lastOwedMs": owed["at"] - start if owed else None,
                     "lastStoredMs": stored["at"] - start if stored else None,
                     "done": done, "missed": done is None or done >= 1000})
    return dict(offers=rows, stale=stale, misses=sum(row["missed"] for row in rows)), count


def compressed_hash(file):
    # The producer hashes the JSON string containing the base64 bytes, including the quotes.
    checksum = hashlib.sha256(b'"')
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(3 * 65536), b""):
            checksum.update(base64.b64encode(block))
    checksum.update(b'"')
    return checksum.hexdigest()


def activation_modes(folder, result, start):
    """Require the v2 clock, each mode's immutable run and both routes in every segment."""
    assert result["format"] == "activation-clock/2"
    binding = result["binding"]
    expected = get(folder / "loaded.json")["offers"]
    assert len(expected) == result["loaded"]["count"] and len(expected) % 2 == 0
    n, count = result["subjects"], len(expected) // 2
    assert set(result["arms"]) == {"reference", "record", "stored"}
    readings = {}
    for j, phase in enumerate(("reference", "record", "stored")):
        directory = folder / phase
        path = directory / "result.json"
        output = get(path)
        scope = f"delta-audit-{n}-{phase}-{binding['nonce']}"
        assert path.stat().st_mtime >= start - 2
        assert result["arms"][phase] == dict(scope=scope, sha=digest(path))
        assert output["scope"] == scope and output["binding"] == binding and output["subjects"] == n
        if phase == "reference":
            assert output["reference"] == result["reference"]
            continue
        assert output["source"] == result["source"] and re.fullmatch(r"[a-f0-9]{64}", output["source"])
        timings = output["loaded"]
        assert timings == get(directory / "timings.json") and timings["count"] == count
        assert timings["binding"]["scope"] == scope and all(timings["binding"][k] == v for k, v in binding.items())
        assert timings["mode"] == phase and timings["routeNames"] == ["public", "fresh-process"]
        assert len(timings["readers"]) == 64 and all(n > 0 for n in timings["readers"])
        offers = timings["all"]
        assert offers == expected[(j - 1) * count:j * count]
        assert all(o["id"] == f"audit-publish-{i}" and o["order"] == i and o["mode"] == phase
                   and math.isfinite(o["scheduled"]) and math.isfinite(o["ingress"])
                   and o["ingress"] >= o["scheduled"] for i, o in enumerate(offers))
        assert len(timings["segments"]) == len(timings["reports"]) == (count + 29) // 30
        values, misses, stale = [], 0, 0
        for i, (segment, reported) in enumerate(zip(timings["segments"], timings["reports"])):
            base = 30 * i
            portion = offers[base:base + 30]
            assert segment["file"] == f"reads-{base}.ndjson.gz"
            raw = directory / segment["file"]
            assert raw.stat().st_mtime >= start - 2 and compressed_hash(raw) == segment["sha"]
            assert get(directory / f"offers-{base}.json") == dict(binding=timings["binding"], offers=portion)
            schedule = [{k: o[k] for k in ("id", "order", "scheduled")} for o in portion]
            assert get(directory / f"schedule-{base}.json") == dict(binding=timings["binding"], mode=phase, schedule=schedule)
            assert all(s["scheduled"] == schedule[0]["scheduled"] + i * 1000 for i, s in enumerate(schedule))
            with gzip.open(raw, "rt") as stream:
                score, entries = clock_rows(portion, (json.loads(line) for line in stream), phase)
            assert score == reported and entries == segment["count"] == segment["verified"]["observations"]
            proven = [o for o in portion if o.get("ack") and o.get("owed") and (bool(o.get("stored")) == (phase == "stored"))]
            assert len(proven) == len(segment["verified"]["proofs"])
            for offer, proof in zip(proven, segment["verified"]["proofs"]):
                assert proof["id"] == offer["id"] and proof["mode"] == phase
                assert proof["pos"] == offer["ack"]["position"] and proof["seq"] == offer["ack"]["seq"]
                assert proof["owedCut"] == offer["owed"]["position"] and proof["stored"] == (offer.get("stored") or {}).get("position")
                assert all(re.fullmatch(r"[a-f0-9]{64}", proof[k]) for k in ("digest", "object"))
            values.extend(row["done"] for row in score["offers"] if row["done"] is not None)
            misses += score["misses"]
            stale += score["stale"]
        metrics = dict(p99=nearest(values, 99) if len(values) == count else None, misses=misses, stale=stale)
        assert metrics == {key: timings[key] for key in metrics}
        readings[phase] = metrics
    return readings
