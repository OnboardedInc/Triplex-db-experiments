#!/usr/bin/env python3
"""[DX-ACT4] Read the held Publish runner's window files for why live saves' p99 rose during Publish.

For each window (held-<mode>-<rate>-<publish>.json) it prints: the save p99; the whole-store stalls (seconds in which
20 or more saves of all accounts took over 100 ms), each with its start, its worst save and the longest gap between two
transactor completions inside it; the save p99 outside those seconds (and one second either side); the saves whose
life overlapped a Publish's hold (pause of admission to the Publish's durable acknowledgement) and their p99; the
Publish hold itself; and the transactor's index adoptions (from tx.jsonl) near the window. Then, for each Publish
window, its ratios to the matched control: all saves, and outside stalls.

Usage: stall-reading.py RESULT_DIR [RESULT_DIR ...]   (each the runner's result directory, with engines/*/trace/raw/tx.jsonl)
Rejected: changing the runner's own ratio (the bar's number stays what it was; this only explains it).
"""
import collections
import glob
import json
import os
import sys


def pct(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    return round(xs[min(len(xs) - 1, max(0, int(len(xs) * p + 0.999999) - 1))], 1)


def window(path, adoptions):
    o = json.load(open(path))
    b, e = o["begins"], o["ends"]
    saves = [s for s in o["saves"] if s.get("end") and s["status"] == "acked"]
    lat = [s["end"] - s["due"] for s in saves]
    slow = collections.Counter(int((s["due"] - b) / 1000) for s, l in zip(saves, lat) if l > 100)
    stall_secs = sorted(k for k, v in slow.items() if v >= 20)
    near = {k + d for k in stall_secs for d in (-1, 0, 1)}
    outside = [l for s, l in zip(saves, lat) if int((s["due"] - b) / 1000) not in near]
    stalls, seen = [], set()
    for k in stall_secs:
        if k in seen:
            continue
        group = {k}
        while max(group) + 1 in stall_secs:
            group.add(max(group) + 1)
        seen |= group
        inside = [s for s, l in zip(saves, lat) if int((s["due"] - b) / 1000) in group and l > 100]
        lo, hi = min(x["due"] for x in inside), max(x["end"] for x in inside)
        ends = sorted(x["end"] for x in saves if lo - 500 <= x["end"] <= hi)
        gap = max((ends[i + 1] - ends[i] for i in range(len(ends) - 1)), default=0)
        stalls.append({"startS": round((lo - b) / 1000, 2), "worstMs": round(max(x["end"] - x["due"] for x in inside)),
                       "longestCompletionGapMs": round(gap, 1), "saves": len(inside)})
    holds = [(n["pausedAt"], n["r"]["durableAt"]) for n in o.get("native", [])]
    in_hold = [l for s, l in zip(saves, lat) if any(s["due"] <= r and s["end"] >= p for p, r in holds)]
    ev = o["evidence"]
    return {
        "window": os.path.basename(path)[5:-5],
        "publish": ev["publish"],
        "saves": len(saves),
        "p99": pct(lat, 0.99),
        "stalls": stalls,
        "p99OutsideStalls": pct(outside, 0.99),
        "savesOutsideStalls": len(outside),
        "inHold": {"saves": len(in_hold), "share": round(len(in_hold) / len(saves), 4), "p99": pct(in_hold, 0.99)},
        "publishHoldMs": {"p50": pct([r - p for p, r in holds], 0.5), "p99": pct([r - p for p, r in holds], 0.99)},
        "adoptionsS": [round((a["start"] - b) / 1000, 1) for a in adoptions if b - 5000 <= a["start"] <= e + 5000],
    }


for root in sys.argv[1:]:
    tx = glob.glob(os.path.join(root, "engines", "*", "trace", "raw", "tx.jsonl"))
    adoptions = [json.loads(l) for l in open(tx[0]) if '"index-adoption"' in l] if tx else []
    rows = [window(p, adoptions) for p in sorted(glob.glob(os.path.join(root, "held-*-*-[01].json")))]
    by = {r["window"]: r for r in rows}
    for r in rows:
        if r["publish"]:
            c = by.get(r["window"][:-1] + "0")
            if c:
                r["ratioAll"] = round(r["p99"] / c["p99"], 2)
                r["ratioOutsideStalls"] = round(r["p99OutsideStalls"] / c["p99OutsideStalls"], 2)
        print(json.dumps(r))
