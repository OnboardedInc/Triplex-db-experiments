"""[DX-LOAD2] Transactor heap, ZGC allocation stalls and storage reads in PREP1 save runs (no import).

Usage: python3 -I heap_reading.py ROOT [ROOT ...]
Each ROOT is an extracted run (summary and raw members together) holding one or more `*-S/` arm folders with
r*-loaded.json, summary.json and launch-profile.json, and `engines/*-<arm>-s/trace/raw/` with prep1-gc-tx.log and
prep1-index.ndjson. Prints one JSON line per loaded cell. Standard library only.
"""
import datetime
import glob
import json
import os
import re
import statistics
import sys

ADOPT_MS = 6000
COLD_MS = 60000


def pct(values, p):
    v = sorted(values)
    return v[max(0, int(len(v) * p + 0.999999) - 1)] if v else None


def gc_events(path):
    stalls, cycles = [], []
    with open(path) as f:
        for line in f:
            m = re.match(r"\[(\d{4}-\d\d-\d\dT[\d:.]+)\+0000\]", line)
            if not m:
                continue
            at = datetime.datetime.fromisoformat(m.group(1)).replace(tzinfo=datetime.timezone.utc).timestamp() * 1000
            a = re.search(r"Allocation Stall \(([^)]*)\) ([\d.]+)ms", line)
            if a:
                t = a.group(1)
                kind = ("writer" if t.startswith("processor-") else "log" if t.startswith("log-")
                        else "indexer" if t.startswith("indexer") else "reader" if t.startswith("reader-")
                        else "pool" if t.startswith("clojure-agent") else "other")
                stalls.append((at, kind, float(a.group(2))))
            c = re.search(r"(Minor|Major) Collection \(([^)]+)\) (\d+)M\((\d+)%\)->(\d+)M\((\d+)%\) ([\d.]+)s", line)
            if c:
                cycles.append((at, c.group(1), c.group(2), int(c.group(4)), int(c.group(6)), float(c.group(7))))
    return stalls, cycles


def main():
    for root in sys.argv[1:]:
        for arm_dir in sorted(glob.glob(os.path.join(root, "**", "1-*-S"), recursive=True)):
            arm = os.path.basename(arm_dir)
            eng = glob.glob(os.path.join(os.path.dirname(arm_dir), "engines", "*-" + arm.lower(), "trace", "raw"))
            if len(eng) != 1:
                print(json.dumps({"root": root, "arm": arm, "error": "no engine trace"}))
                continue
            with open(os.path.join(arm_dir, "launch-profile.json")) as f:
                prof = json.load(f)
            heap = next(x for x in prof["tx"]["flags"] if x.startswith("-Xmx"))
            with open(os.path.join(arm_dir, "summary.json")) as f:
                summary = {c["cell"]: c for c in json.load(f)["cells"]}
            stalls, cycles = gc_events(os.path.join(eng[0], "prep1-gc-tx.log"))
            adoptions = []
            with open(os.path.join(eng[0], "prep1-index.ndjson")) as f:
                for line in f:
                    e = json.loads(line)
                    if e.get("type") == "index-adoption":
                        adoptions.append(e["end"])
            for cell_file in sorted(glob.glob(os.path.join(arm_dir, "r*-loaded.json"))):
                with open(cell_file) as f:
                    cell = json.load(f)
                name = os.path.basename(cell_file)[:-5]
                wall0, mono0 = cell["phaseWallMs"], int(cell["phaseStartNs"]) / 1e6
                span = max(300_000, cell.get("drained") or 0)
                inside = lambda t: wall0 <= t < wall0 + span
                st = [s for s in stalls if inside(s[0])]
                cy = [c for c in cycles if inside(c[0])]
                ad = sorted(a - mono0 for a in adoptions if 0 <= a - mono0 < span)
                rows = [r for r in cell["rows"] if r.get("ack") and r.get("end") is not None]
                busy = [r for r in rows if r["account"] != 0]

                def since(t):
                    p = [t - a for a in ad if a <= t]
                    return min(p) if p else float("inf")

                def classify(group):
                    n = len(group) or 1
                    # A save "met" a stall if a transactor stall of 50 ms or more ended between 2 s before it was
                    # due and its acknowledgement: the stall or the queue it left behind was in front of it.
                    lived = lambda r: any(r["due"] - 2000 <= s[0] - wall0 <= r["end"] for s in st if s[2] >= 50)
                    post = lambda r: since(r["due"]) < ADOPT_MS
                    cold = lambda r: r["due"] < COLD_MS
                    a = sum(map(lived, group)); b = sum(map(post, group)); c = sum(map(cold, group))
                    only_reads = sum(1 for r in group if post(r) and not lived(r))
                    neither = sum(1 for r in group if not lived(r) and not post(r) and not cold(r))
                    return {"n": len(group), "metStall50ms": round(a / n, 3),
                            "due0to6sAfterAdoption": round(b / n, 3), "dueInFirstMinute": round(c / n, 3),
                            "afterAdoptionWithoutStall": round(only_reads / n, 3), "noneOfThese": round(neither / n, 3)}

                out = {}
                for label, lo, hi in [("whole", 0, span), ("firstMinute", 0, COLD_MS), ("secondHalf", 150_000, 300_000)]:
                    g = [r for r in busy if lo <= r["due"] < hi]
                    lat = [r["end"] - r["due"] for r in g]
                    p99 = pct(lat, 0.99)
                    top = [r for r in g if r["end"] - r["due"] >= p99] if p99 is not None else []
                    wst = [s for s in st if lo <= s[0] - wall0 < hi]
                    allg = [r for r in rows if lo <= r["due"] < hi]
                    secs = (min(hi, span) - lo) or 1
                    union, cur = 0.0, None
                    for b, e in sorted((s[0] - s[2] - wall0, s[0] - wall0) for s in st if lo <= s[0] - wall0 < hi):
                        if cur and b <= cur[1]:
                            cur[1] = max(cur[1], e)
                        else:
                            if cur:
                                union += cur[1] - cur[0]
                            cur = [b, e]
                    if cur:
                        union += cur[1] - cur[0]
                    out[label] = {
                        "busyP99Ms": round(p99, 1) if p99 is not None else None,
                        "applyBusyShare": round(sum(r["ack"].get("nativeComputeMs") or 0 for r in allg) / secs, 3),
                        "anyThreadStallShare": round(union / secs, 4),
                        "sqlPerSave": round(statistics.fmean(r["ack"]["nativeIoStats"]["reads"].get("sql", 0) for r in g), 3) if g else None,
                        "writerStalls": [len([s for s in wst if s[1] == "writer"]), round(sum(s[2] for s in wst if s[1] == "writer")),
                                         round(max([s[2] for s in wst if s[1] == "writer"] or [0]))],
                        "anyThreadStalls": [len(wst), round(max([s[2] for s in wst] or [0]))],
                        "slowest1pct": classify(top),
                    }
                kinds = {}
                for _, k, ms in st:
                    kinds.setdefault(k, [0, 0.0, 0.0])
                    kinds[k][0] += 1; kinds[k][1] += ms; kinds[k][2] = max(kinds[k][2], ms)
                headline = summary.get(name, {})
                print(json.dumps({
                    "root": os.path.basename(os.path.normpath(root)), "arm": arm, "cell": name, "heap": heap,
                    "cacheMiB": prof["tx"]["cacheMiB"], "cores": prof["tx"]["cores"],
                    "storedPerSecond": headline.get("confirmedPerSecond"),
                    "secondHalfStored": headline.get("secondHalf", {}).get("rate"),
                    "expired": headline.get("whole", {}).get("expired"),
                    "busyP99MsWhole": headline.get("whole", {}).get("ackedP99Ms"),
                    "busyP99MsSecondHalf": headline.get("secondHalf", {}).get("ackedP99Ms"),
                    "quietP99MsWhole": headline.get("whole", {}).get("quietP99Ms"),
                    "sqlPerSaveWhole": headline.get("nativeIoPerSave", {}).get("sql", {}).get("mean"),
                    "adoptions": [round(a / 1000, 1) for a in ad],
                    "stallsByThread": {k: [v[0], round(v[1]), round(v[2])] for k, v in kinds.items()},
                    "collections": len(cy),
                    "freeAtCollectionStartPct": [100 - max([c[3] for c in cy] or [0]),
                                                 100 - (round(statistics.median(c[3] for c in cy)) if cy else 0)],
                    "windows": out,
                }))


if __name__ == "__main__":
    main()
