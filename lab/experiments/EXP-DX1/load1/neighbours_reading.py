"""[DX-LOAD2] Read where live saves spend their time beside a fair import.

Usage: python3 -I neighbours_reading.py SUMMARY_DIR RAW_DIR [MODE ...]
SUMMARY_DIR and RAW_DIR are the extracted summary.tar.zst and raw.tar.zst of a fair-import run
(each holds result/). Prints the tables used in NEIGHBOURS-SERVER.md, the transactor's ZGC allocation stalls and safepoints when
prep1-gc-tx.log is present, and frames' own SQL reads when the run recorded frame stages. Standard library only.
"""
import bisect
import datetime
import glob
import re
import json
import os
import statistics
import sys


def pct(values, p):
    v = sorted(values)
    return v[max(0, int(len(v) * p + 0.999999) - 1)] if v else float("nan")


def mean(values):
    return statistics.fmean(values) if values else float("nan")


def load(summary, raw):
    trace = glob.glob(os.path.join(raw, "result/engines/*/trace/raw"))
    assert len(trace) == 1, trace
    trace = trace[0]
    offset = None
    adoptions, cpu = [], []
    with open(os.path.join(trace, "tx.jsonl")) as f:
        for line in f:
            r = json.loads(line)
            if r.get("type") == "index-adoption":
                adoptions.append(r["end"])
            elif r.get("type") == "jvm-runtime" and r.get("process") == "tx":
                cpu.append((r["at"], r["cpuStat"]["usage_usec"]))
            if offset is None and "clock" in r:
                offset = r["clock"]["offsetMs"]
    native = {}
    with open(os.path.join(trace, "prep1-native.ndjson")) as f:
        for line in f:
            e = json.loads(line)
            if "members" not in e:
                continue
            for m in e["members"]:
                native[int(m["t"])] = {
                    "read": m["read-at"] / 1e6 + offset,
                    "start": m["started-at"] / 1e6 + offset,
                    "applied": m["applied-at"] / 1e6 + offset,
                    "logStart": e["start"] / 1e6 + offset,
                    "logEnd": e["end"] / 1e6 + offset,
                    "datoms": m["datom-count"],
                }
    return sorted(adoptions), cpu, native


def cell(summary, raw, mode, name):
    with open(os.path.join(raw, f"result/{mode}-{name}-raw.json")) as f:
        data = json.load(f)
    with open(os.path.join(summary, f"result/{mode}-{name}.json")) as f:
        meta = json.load(f)
    data["width"] = meta.get("width", 32)
    return data, meta["start"]


def pauses(summary, raw):
    """[DX-LOAD2] Transactor ZGC allocation stalls and safepoints from the stack's own -Xlog file.

    The server stack already writes gc*,safepoint*=debug to prep1-gc-tx.log; the 2026-11-21 reading missed it."""
    found = glob.glob(os.path.join(summary, "result/engines/*/trace/raw/prep1-gc-tx.log")) + \
        glob.glob(os.path.join(raw, "result/engines/*/trace/raw/prep1-gc-tx.log"))
    if not found:
        return None
    stalls, safepoints = [], []
    with open(found[0]) as f:
        for line in f:
            m = re.match(r"\[(\d{4}-\d\d-\d\dT[\d:.]+)\+0000\]", line)
            if not m:
                continue
            at = datetime.datetime.fromisoformat(m.group(1)).replace(tzinfo=datetime.timezone.utc).timestamp() * 1000
            a = re.search(r"Allocation Stall \(([^)]*)\) ([\d.]+)ms", line)
            if a:
                thread = a.group(1)
                kind = ("writer" if thread.startswith("processor-") else "log" if thread.startswith("log-")
                        else "indexer" if thread.startswith("indexer") else "other")
                stalls.append((at, kind, float(a.group(2))))
            t = re.search(r'Safepoint "(\w+)".*Total: (\d+) ns', line)
            if t:
                safepoints.append((at, t.group(1), int(t.group(2)) / 1e6))
    return stalls, safepoints


def main():
    summary, raw = sys.argv[1], sys.argv[2]
    modes = sys.argv[3:] or ["rolling6", "barrier6"]
    adoptions, cpu, native = load(summary, raw)
    gc = pauses(summary, raw)

    def since(t):
        i = bisect.bisect_right(adoptions, t) - 1
        return t - adoptions[i] if i >= 0 else float("inf")

    for mode in modes:
        for name in ["control", "import"]:
            data, start = cell(summary, raw, mode, name)
            inside = [a for a in adoptions if start <= a < start + 300_000]
            print(f"\n## {mode} {name}: index adoptions at",
                  [round((a - start) / 1000, 1) for a in inside], "s")
            for label, (lo, hi) in [("first half", (0, 150)), ("second half", (150, 300))]:
                s0, s1 = start + lo * 1000, start + hi * 1000
                saves = [s for s in data["saves"] if s["account"] != 0 and s0 <= s["due"] < s1]
                total = [s["end"] - s["due"] for s in saves]
                p99 = pct(total, 0.99)
                top = [s for s in saves if s["end"] - s["due"] >= p99]

                def parts(group):
                    n = [native[int(s["receipt"]["t"])] for s in group]
                    return {
                        "total": mean([s["end"] - s["due"] for s in group]),
                        "waitForCredit": mean([s["dispatched"] - s["due"] for s in group]),
                        "clientToGateway": mean([s["sent"] - s["dispatched"] for s in group]),
                        "gatewayPrepare": mean([s["stage"]["timeline"]["submitted"] / 1000 for s in group]),
                        "transactorQueue": mean([x["start"] - x["read"] for x in n]),
                        "serialApply": mean([x["applied"] - x["start"] for x in n]),
                        "appliedToLogEnd": mean([x["logEnd"] - x["applied"] for x in n]),
                        "sqlReadsPerSave": mean([s["stage"]["nativeIoStats"]["reads"].get("sql", 0) for s in group]),
                    }

                busy = sum(min(x["applied"], s1) - max(x["start"], s0)
                           for x in native.values() if x["applied"] > s0 and x["start"] < s1)
                window = [c for c in cpu if s0 <= c[0] <= s1]
                cores = (window[-1][1] - window[0][1]) / 1000 / (window[-1][0] - window[0][0])
                after = sum(1 for s in top if since(s["due"]) < 6000) / len(top)
                print(f"- {label}: busy save p99 {p99:.1f} ms over {len(saves)} saves; serial apply busy "
                      f"{busy / (s1 - s0) * 100:.0f}%; transactor {cores:.2f} cores; slowest 1% due within 6 s "
                      f"after an adoption {after * 100:.0f}% (all saves {sum(1 for s in saves if since(s['due']) < 6000) / len(saves) * 100:.0f}%)")
                print("  slowest 1% mean ms:", {k: round(v, 2) for k, v in parts(top).items()})
                print("  all saves mean ms:  ", {k: round(v, 2) for k, v in parts(saves).items()})
                frames = [f for f in data["imported"] if s0 <= f["at"] < s1]
                if frames:
                    n = [native[int(f["receipt"]["t"])] for f in frames]
                    print(f"  frames {len(frames)} ({len(frames) * data['width'] / 150:.0f} facts/s at {data['width']}): hold mean "
                          f"{mean([f['holdMs'] for f in frames]):.2f} ms, apply mean {mean([x['applied'] - x['start'] for x in n]):.2f} "
                          f"p99 {pct([x['applied'] - x['start'] for x in n], .99):.2f} ms, datoms {mean([x['datoms'] for x in n]):.0f}")
            print("  apply by time since the last index adoption (whole window):")
            saves = [s for s in data["saves"] if start <= native[int(s["receipt"]["t"])]["start"] < start + 300_000]
            for lo, hi in [(0, 1), (1, 2), (2, 4), (4, 8), (8, 15), (15, None)]:
                def inb(x):
                    d = since(x["start"])
                    return lo * 1000 <= d and (hi is None or d < hi * 1000)
                sv = [native[int(s["receipt"]["t"])] for s in saves]
                sv = [(s, x) for s, x in zip(saves, sv) if inb(x)]
                fr = [native[int(f["receipt"]["t"])] for f in data["imported"]]
                fr = [x for x in fr if inb(x)]
                line = (f"    {lo:>2}-{hi if hi else 'end':<3} s: saves {len(sv):6d} apply {mean([x['applied'] - x['start'] for _, x in sv]):5.2f} ms "
                        f"(p99 {pct([x['applied'] - x['start'] for _, x in sv], .99):6.2f}), SQL reads/save "
                        f"{mean([s['stage']['nativeIoStats']['reads'].get('sql', 0) for s, _ in sv]):.2f}")
                if fr:
                    line += (f" | frames {len(fr):6d} apply {mean([x['applied'] - x['start'] for x in fr]):6.2f} ms "
                             f"(p99 {pct([x['applied'] - x['start'] for x in fr], .99):6.2f})")
                print(line)
            if data["imported"]:
                print("  single writer stalls of 100 ms or more (time in cell, kind, apply, log append, s after adoption):")
                kind = {int(f["receipt"]["t"]): "frame" for f in data["imported"]}
                for s in data["saves"]:
                    kind[int(s["receipt"]["t"])] = "quiet" if s["account"] == 0 else "busy"
                for t, x in sorted(native.items(), key=lambda kv: kv[1]["start"]):
                    if not (start <= x["start"] < start + 300_000):
                        continue
                    a, lg = x["applied"] - x["start"], x["logEnd"] - x["logStart"]
                    if a >= 100 or lg >= 100:
                        overlap = ""
                        if gc:
                            near = [(k, ms) for at, k, ms in gc[0]
                                    if x["start"] - 50 <= at <= max(x["applied"], x["logEnd"]) + 50 and ms >= 20]
                            overlap = " | allocation stalls ending inside: " + (
                                ", ".join(f"{k} {ms:.0f} ms" for k, ms in near) if near else "none")
                        print(f"    {(x['start'] - start) / 1000:7.2f} s {kind.get(t, '?'):5s} apply {a:6.1f} log {lg:6.1f} "
                              f"after adoption {since(x['start']) / 1000:5.2f} s{overlap}")
            if gc:
                s0, s1 = start, start + 300_000
                cs = [(at, k, ms) for at, k, ms in gc[0] if s0 <= at < s1]
                sp = [ms for at, _, ms in gc[1] if s0 <= at < s1]
                w = [ms for _, k, ms in cs if k == "writer"]
                print(f"  transactor ZGC allocation stalls: writer thread {len(w)} (total {sum(w):.0f} ms, max "
                      f"{max(w or [0]):.0f}), any thread {len(cs)}; safepoints {len(sp)}, max {max(sp or [0]):.2f} ms")
                for at, k, ms in cs:
                    if k == "writer" and ms >= 20:
                        print(f"    writer stall {ms:6.1f} ms ending at {(at - s0) / 1000:7.2f} s, {since(at) / 1000:5.2f} s after adoption")
            frames = [f for f in data["imported"] if f.get("stage", {}).get("nativeIoStats")]
            if frames:
                print("  frames' own SQL reads by time since adoption:")
                for lo, hi in [(0, 1), (1, 2), (2, 4), (4, 8), (8, 15), (15, None)]:
                    g = [f for f in frames if lo * 1000 <= since(native[int(f["receipt"]["t"])]["start"])
                         and (hi is None or since(native[int(f["receipt"]["t"])]["start"]) < hi * 1000)]
                    reads = [f["stage"]["nativeIoStats"].get("reads", {}).get("sql", 0) for f in g]
                    print(f"    {lo:>2}-{hi if hi else 'end':<3} s: frames {len(g):6d} SQL reads/frame {mean(reads):.2f}")


if __name__ == "__main__":
    main()
