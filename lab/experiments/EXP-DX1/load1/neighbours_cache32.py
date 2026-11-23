"""[DX-LOAD2] Save apply and SQL reads by time since the last index adoption in a PREP1 save run.

Usage: python3 -I neighbours_cache32.py CELL_JSON NATIVE_NDJSON INDEX_NDJSON
For example the 394/s loaded cell of the 32 GiB cache arm, its prep1-native.ndjson and prep1-index.ndjson.
Only saves due from 150 s onwards count, as in the cache32 reading. Standard library only.
"""
import json
import statistics
import sys


def pct(values, p):
    v = sorted(values)
    return v[max(0, int(len(v) * p + 0.999999) - 1)] if v else float("nan")


def main():
    cells, native_file, index_file = sys.argv[1:4]
    with open(cells) as f:
        data = json.load(f)
    adoptions = []
    with open(index_file) as f:
        for line in f:
            e = json.loads(line)
            if e["type"] == "index-adoption":
                adoptions.append(e["end"])
    native = {}
    with open(native_file) as f:
        for line in f:
            e = json.loads(line)
            for m in e.get("members", []):
                native[int(m["t"])] = (m["started-at"] / 1e6, m["applied-at"] / 1e6)

    def since(t):
        prior = [t - a for a in adoptions if a <= t]
        return min(prior) if prior else float("inf")

    rows = [r for r in data["rows"] if r.get("ack") and r["due"] >= 150_000]
    for lo, hi in [(0, 1), (1, 2), (2, 4), (4, 8), (8, 15), (15, None)]:
        group = []
        for r in rows:
            start, applied = native[int(r["ack"]["t"]["v"])]
            d = since(start)
            if lo * 1000 <= d and (hi is None or d < hi * 1000):
                group.append((applied - start, r["ack"]["nativeIoStats"]["reads"].get("sql", 0)))
        apply = [g[0] for g in group]
        sql = [g[1] for g in group]
        print(f"{lo:>2}-{hi if hi else 'end':<3} s after adoption: saves {len(group):6d} apply mean "
              f"{statistics.fmean(apply) if apply else float('nan'):5.2f} p99 {pct(apply, .99):5.2f} ms, "
              f"SQL reads/save {statistics.fmean(sql) if sql else float('nan'):.3f}")


if __name__ == "__main__":
    main()
