"""Reconcile HA1's published one-host import observations with its offer tapes."""

from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import re

from producer_readings import digest, get, nearest


TAIL_ARMS = ("tail-0-a", "tail-128", "tail-500", "tail-2000", "tail-0-b")


def tail_arm(directory, attempt, name):
    # [DX-BM1] Why: join every scheduled offer and bulk ACK to this scope's immutable receipt.
    # Rejected: accepting an open-loop p99 after dropping expired, missing, or unverified offers.
    f = directory / (name + ".offers.json")
    tape = get(f)
    duration = 108_000
    scope = "tx2-ha1-" + attempt["nonce"][:8] + "-" + name
    assert (tape["nonce"], tape["source"], tape["slot"], tape["scope"], tape["duration"]) == (
        attempt["nonce"], attempt["source"]["git"], attempt["slot"], scope, duration)
    assert math.isfinite(tape["start"])
    due = {(actor, kind, i): i * 200 for actor, kind in (("quiet", "save"), ("quiet", "read")) for i in range(540)}
    due.update({("live" + str(i % 10), "save", i): i * 20 for i in range(5_400)})
    native = {row["command"]: row["position"] for row in tape["native"]}
    assert len(native) == len(tape["native"]) == len(set(native.values()))
    bins = defaultdict(lambda: defaultdict(list))
    for row in tape["samples"]:
        actor, kind, seq = row["actor"], row["kind"], row["seq"]
        assert due.pop((actor, kind, seq)) == row["due"]
        assert math.isfinite(row["offered"]) and math.isfinite(row["end"])
        assert row["outcome"] != "pending" and row["end"] >= row["offered"] >= row["due"] - 5
        if kind == "save" and row["outcome"] == "verified":
            assert native[f"save/{actor}/{seq}"] == row["seen"]["position"] > 0
        bins[actor][kind].append(row)
    assert not due
    neighbors = {}
    for actor, kinds in bins.items():
        neighbors[actor] = {}
        for kind in ("save", "read"):
            rows = kinds[kind]
            values = [r["end"] - r["due"] for r in rows if r["outcome"] == "verified"]
            neighbors[actor][kind] = dict(offered=len(rows), ok=len(values), p99Ms=nearest(values, 99) if values else None,
                                          outcomes=dict(Counter(r["outcome"] for r in rows)))
    frames = tape["ordered"]
    assert len({r["command"] for r in frames}) == len(frames)
    for row in frames:
        assert row["first"] < row["end"] and row["facts"] > 0
        assert row["offer"] < duration and row["ack"] >= row["offer"]
        assert native[row["command"]] == row["position"]
    facts = sum(r["facts"] for r in frames if r["ack"] <= duration)
    if name in (TAIL_ARMS[0], TAIL_ARMS[-1]):
        assert not frames
    return dict(arm=name, scope=scope, duration=duration, rate=50, neighbors=neighbors, facts=facts,
                fps=facts / (duration / 1000), tapeSha256=digest(f))


def tail_attempt(root, r):
    campaign = get(root / "campaign.json")
    assert (campaign["tag"], campaign["sha"], campaign["mode"], campaign["sizes"], campaign["layout"]) == (
        r["tag"], r["source"], "load-tail", [50], "one-host")
    assert re.fullmatch(r"[a-f0-9-]{36}", campaign["campaign"])
    directory, = root.glob("load-tail-*")
    attempt = get(directory / "attempt.json")
    assert directory.name == "load-tail-" + attempt["nonce"]
    assert attempt["mode"] == "load-tail" and attempt["slot"] == r["tag"] and attempt["source"]["git"] == r["source"]
    assert get(directory / "cleanup.json") == dict(nonce=attempt["nonce"], containers=0, networks=0)
    path = directory / "observations.json"
    assert path.stat().st_mtime >= r["start"] - 2
    published = get(path)
    assert (published["nonce"], published["slot"], published["source"]) == (attempt["nonce"], r["tag"], attempt["source"])
    assert published["profile"] == dict(people=50, capacity="one-host", scopes=1)
    assert [row["arm"] for row in published["result"]] == list(TAIL_ARMS)
    assert len({row["sourceSeal"] for row in published["result"]}) == 1
    rows = []
    for name, expected in zip(TAIL_ARMS, published["result"]):
        assert (directory / (name + ".offers.json")).stat().st_mtime >= r["start"] - 2
        row = tail_arm(directory, attempt, name)
        assert all(expected[k] == v for k, v in row.items() if k != "tapeSha256")
        assert get(directory / ("arm-" + name + ".json")) == expected
        rows.append(row)
    return path, rows
