"""Recount the native small-save and queue studies from their sealed managed logs."""
from collections import defaultdict, Counter
import importlib.util
import json
from pathlib import Path
from statistics import median, mean
import sys

spec = importlib.util.spec_from_file_location("managed_evidence", Path(__file__).resolve().parents[1] / "field/verify.py")
managed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(managed)


def fit(cells, field):
    rows = [(n, b / 1024, median(r[field] for r in items)) for (n, b), items in cells.items()]
    ns, bs, ys = map(mean, zip(*rows))
    n_slope = sum((n - ns) * (y - ys) for n, b, y in rows) / sum((n - ns) ** 2 for n, b, y in rows)
    b_slope = sum((b - bs) * (y - ys) for n, b, y in rows) / sum((b - bs) ** 2 for n, b, y in rows)
    return {"fixedMs": ys - ns * n_slope - bs * b_slope, "msPerDatom": n_slope, "msPerKiB": b_slope}


def costs(nonce, by_kind):
    rows = by_kind["cost"]
    assert len(rows) == 9 * 32
    allowed = [(n + 1, b) for n in [4, 16, 48] for b in [2048, 8192, 24576]]
    cells = defaultdict(list)
    last = 0
    for i, r in enumerate(rows):
        block = i // 9
        cell = ((i if block % 2 == 0 else -i) + block) % 9
        assert r["serial"] == 60 + i and r["block"] == block and r["cell"] == cell
        assert (r["datoms"], r["valueBytes"]) == allowed[cell]
        assert r["db"] == managed.db_name(nonce + "-factorial", "small")
        assert r["t"] > last and r["nativeMs"] == r["io"]["api-ms"] and 0 < r["nativeMs"] <= r["roundTripMs"]
        last = r["t"]
        cells[allowed[cell]].append(r)
    assert all(len(xs) == 32 for xs in cells.values())
    return {"fit": {kind: fit(cells, kind) for kind in ("nativeMs", "roundTripMs")},
            "cells": [{"datoms": n, "valueBytes": b, "nativeP50Ms": median(x["nativeMs"] for x in xs),
                       "peerP50Ms": median(x["roundTripMs"] for x in xs),
                       "sqlReads": sum(x["io"]["reads"].get("sql", 0) for x in xs)} for (n,b), xs in sorted(cells.items())]}


def layouts(nonce, by_kind):
    rows, shapes = by_kind["layout"], by_kind["shape"]
    assert len(rows) == 4 * 128 and len(shapes) == 8
    cells = defaultdict(list)
    interleaved = all("io" in r for r in rows)
    for idx, r in enumerate(rows):
        if interleaved:
            i = 32 + idx // 4
            arm = idx % 4 if i // 2 % 2 == 0 else 3 - idx % 4
        else:
            arm, offset = divmod(idx, 128)
            i = 32 + offset
        w = 1 if i % 2 == 0 else 3
        assert [r["arm"], r["index"], r["width"], r["packed"]] == [arm, i, w, arm in (1, 2)]
        assert r["db"] == managed.db_name(nonce + "-layout-" + str(arm), "small")
        assert r["position"] == str(i + 3) and r["op"] == "correction-" + str(i + 10)
        assert r["nativeMs"] > 0
        if interleaved:
            assert r["io"]["api-ms"] == r["nativeMs"]
        cells[arm, w].append(r)
    counts = {}
    for s in shapes:
        arm, w = s["arm"], s["width"]
        assert s["db"] == managed.db_name(nonce + "-layout-" + str(arm), "small")
        assert s["operation"] == ("correction-10" if w == 1 else "correction-11")
        assert s["requestBytes"] == s["requestFramingBytes"] + sum(s["requestByKey"].values())
        assert all(r["valueBytes"] > 0 and r["ednBytes"] > r["valueBytes"] for r in s["data"])
        assert sum(r["attribute"] == "row" and r["field"] == ":_tx/change" for r in s["data"]) == 2 * w
        purpose = defaultdict(Counter)
        for r in s["data"]:
            name = r["attribute"] + ("/" + r["field"] if r["field"] else "")
            p = purpose[name + (" add" if r["add"] else " retract")]
            p.update({"count": 1, "valueBytes": r["valueBytes"], "ednBytes": r["ednBytes"]})
        s["purpose"] = dict(sorted(purpose.items()))
        counts[arm,w] = sum(p["count"] for p in purpose.values())
    arm_summary = []
    for (arm,w), items in sorted(cells.items()):
        assert len(items) == 64 and len({r["t"] for r in items}) == 64
        assert all(r["datoms"] >= counts[arm, w] for r in items)
        native = [r["nativeMs"] for r in items]
        authored = [r["io"]["nested"]["function"]["api-ms"] for r in items] if interleaved else []
        peer = [r["awaitMicros"] / 1000 for r in items]
        arm_summary.append({"arm": arm, "width": w, "packed": arm in (1, 2), "samples": len(items),
                            "nativeMs": [median(native), managed.percentile(native, .99)],
                            "functionMs": [median(authored), managed.percentile(authored, .99)] if authored else None,
                            "awaitMs": [median(peer), managed.percentile(peer, .99)]})
    return {"arms": arm_summary, "shapes": shapes}


if __name__ == "__main__":
    out, target = map(Path, sys.argv[1:])
    nonce, lines, events, study, sources, binding = managed.load(out)
    by_kind = defaultdict(list)
    for line in lines:
        if line.startswith("W1_SMALL "):
            row = json.loads(line[9:])
            assert row["attempt"] == nonce
            by_kind[row["kind"]].append(row["data"])
    assert [e["k"] for e in events] == ["sql", "finished"]
    assert study in ("small-cost", "small-layout")
    result = costs(nonce, by_kind) if study == "small-cost" else layouts(nonce, by_kind)
    with target.open("x") as f:
        json.dump({"binding": binding, "analysis": managed.filehash(Path(__file__)), **result}, f, indent=2)
        f.write("\n")
