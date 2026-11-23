"""[DX-LOAD2] PostgreSQL vacuum, WAL and commit-stage reading of PREP1 save runs.

Usage: python3 -I vacuum_reading.py ROOT [ROOT ...]
Each ROOT is an extracted run with `*-S/` arm folders (counters.ndjson, postgres.log, pg-settings.json, r*-alone.json,
r*-loaded.json) and `engines/*-<arm>-s/trace/raw/prep1-native.ndjson`. counters.ndjson carries one sample per second
of pg_stat_wal, pg_stat_io by backend type and the PostgreSQL cgroup's CPU. Prints one JSON line per cell.
Standard library only.
"""
import bisect
import glob
import json
import os
import re
import statistics
import sys


def pct(v, p):
    v = sorted(v)
    return v[max(0, int(len(v) * p + 0.999999) - 1)] if v else None


def header(path):
    with open(path) as f:
        head = f.read(4096)
    wall = int(re.search(r'"phaseWallMs":\s*(\d+)', head).group(1))
    mono = int(re.search(r'"phaseStartNs":\s*"?(\d+)', head).group(1)) / 1e6
    return wall, mono


def io_sum(sample, backend, field):
    return sum((r.get(field) or 0) for r in sample["pg"]["io"] if r["backend_type"] == backend)


def main():
    for root in sys.argv[1:]:
        for arm_dir in sorted(glob.glob(os.path.join(root, "**", "1-*-S"), recursive=True)):
            arm = os.path.basename(arm_dir)
            raw = glob.glob(os.path.join(os.path.dirname(arm_dir), "engines", "*-" + arm.lower(), "trace", "raw"))
            samples = []
            with open(os.path.join(arm_dir, "counters.ndjson")) as f:
                for line in f:
                    d = json.loads(line)
                    if "pg" in d and "wal" in d["pg"]:
                        samples.append(d)
            wall = [int(s["wallNs"]) / 1e6 for s in samples]
            per_sec = []
            for a, b in zip(samples, samples[1:]):
                dt = (int(b["wallNs"]) - int(a["wallNs"])) / 1e9
                if dt <= 0:
                    continue
                per_sec.append({
                    "at": int(b["wallNs"]) / 1e6,
                    "walMB": (b["pg"]["wal"]["wal_bytes"] - a["pg"]["wal"]["wal_bytes"]) / dt / 1e6,
                    "fpi": (b["pg"]["wal"]["wal_fpi"] - a["pg"]["wal"]["wal_fpi"]) / dt,
                    "syncs": (b["pg"]["wal"]["wal_sync"] - a["pg"]["wal"]["wal_sync"]) / dt,
                    "av": (io_sum(b, "autovacuum worker", "reads") - io_sum(a, "autovacuum worker", "reads")
                           + io_sum(b, "autovacuum worker", "writes") - io_sum(a, "autovacuum worker", "writes")) / dt,
                    "reads": (io_sum(b, "client backend", "reads") - io_sum(a, "client backend", "reads")) / dt,
                    "readMs": (io_sum(b, "client backend", "read_time") - io_sum(a, "client backend", "read_time")),
                    "pg": (b["cpu"]["pg"]["usage_usec"] - a["cpu"]["pg"]["usage_usec"]) / 1e6 / dt,
                })
            at = [p["at"] for p in per_sec]
            checkpoints = []
            with open(os.path.join(arm_dir, "postgres.log")) as f:
                for line in f:
                    m = re.search(r"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC \[\d+\] LOG:  checkpoint (starting|complete): ?(\w*)", line)
                    if m:
                        import datetime
                        t = datetime.datetime.fromisoformat(m.group(1)).replace(tzinfo=datetime.timezone.utc).timestamp() * 1000
                        checkpoints.append((t, m.group(2), m.group(3)))
            native = {}
            log_rows = []
            if raw:
                with open(os.path.join(raw[0], "prep1-native.ndjson")) as f:
                    for line in f:
                        e = json.loads(line)
                        if "members" not in e:
                            continue
                        for m in e["members"]:
                            native[int(m["t"])] = (e["start"] / 1e6, e["end"] / 1e6)
                        log_rows.append((e["start"] / 1e6, e["end"] / 1e6, sum(e["bytes"])))
            log_rows.sort()
            log_at = [r[0] for r in log_rows]
            for cell_file in sorted(glob.glob(os.path.join(arm_dir, "r*-*.json"))):
                name = os.path.basename(cell_file)[:-5]
                wall0, mono0 = header(cell_file)
                span = 300_000
                sec = [p for p in per_sec if wall0 <= p["at"] < wall0 + span]
                if not sec:
                    continue
                first = [p for p in sec if p["at"] < wall0 + 60_000]
                later = [p for p in sec if p["at"] >= wall0 + 60_000]
                i0, i1 = bisect.bisect_left(log_at, mono0), bisect.bisect_left(log_at, mono0 + span)
                logs = log_rows[i0:i1]
                appends = [r[1] - r[0] for r in logs]
                f_app = [r[1] - r[0] for r in logs if r[0] < mono0 + 60_000]
                l_app = [r[1] - r[0] for r in logs if r[0] >= mono0 + 60_000]
                out = {
                    "root": os.path.basename(os.path.normpath(root)), "arm": arm, "cell": name,
                    "walMBps": round(statistics.fmean(p["walMB"] for p in sec), 3),
                    "walMBpsFirstMinute": round(statistics.fmean(p["walMB"] for p in first), 3) if first else None,
                    "walMBpsLater": round(statistics.fmean(p["walMB"] for p in later), 3) if later else None,
                    "walMBpsMax1s": round(max(p["walMB"] for p in sec), 2),
                    "datomicLogMBps": round(sum(r[2] for r in logs) / span * 1000 / 1e6, 3),
                    "fpiPerSecond": round(statistics.fmean(p["fpi"] for p in sec), 2),
                    "walSyncsPerSecond": round(statistics.fmean(p["syncs"] for p in sec), 1),
                    "autovacuumPagesPerSecond": round(statistics.fmean(p["av"] for p in sec), 1),
                    "autovacuumActiveSeconds": sum(1 for p in sec if p["av"] > 100),
                    "clientReadsPerSecond": [round(statistics.fmean(p["reads"] for p in first), 0) if first else None,
                                             round(statistics.fmean(p["reads"] for p in later), 0) if later else None],
                    "msPerDiskRead": [round(sum(p["readMs"] for p in first) / max(1, sum(p["reads"] for p in first)), 3) if first else None,
                                      round(sum(p["readMs"] for p in later) / max(1, sum(p["reads"] for p in later)), 3) if later else None],
                    "pgCores": [round(statistics.fmean(p["pg"] for p in sec), 2), round(max(p["pg"] for p in sec), 2)],
                    "pgSecondsAbove0p9": sum(1 for p in sec if p["pg"] >= 0.9),
                    "checkpoints": [c[2] for c in checkpoints if wall0 <= c[0] < wall0 + span and c[1] == "starting"],
                    "logAppendMs": {"p50": round(pct(appends, .5), 2) if appends else None,
                                    "p99": round(pct(appends, .99), 2) if appends else None,
                                    "max": round(max(appends), 1) if appends else None,
                                    "firstMinuteP99": round(pct(f_app, .99), 2) if f_app else None,
                                    "laterP99": round(pct(l_app, .99), 2) if l_app else None},
                }
                if "loaded" in name:
                    with open(cell_file) as f:
                        rows = [r for r in json.load(f)["rows"] if r.get("ack") and r.get("end") is not None]
                    busy = [r for r in rows if r["account"] != 0]
                    for label, lo, hi in [("whole", 0, span), ("firstMinute", 0, 60_000), ("secondHalf", 150_000, span)]:
                        g = [r for r in busy if lo <= r["due"] < hi]
                        lat = [r["end"] - r["due"] for r in g]
                        p99 = pct(lat, .99)
                        top = [r for r in g if r["end"] - r["due"] >= p99]

                        def sample_at(r):
                            j = bisect.bisect_right(at, wall0 + r["due"]) - 1
                            return per_sec[j] if 0 <= j < len(per_sec) else None

                        def pg_busy(r):
                            # PostgreSQL's one core at 90% or more in any second the save was waiting.
                            j0 = bisect.bisect_left(at, wall0 + r["due"])
                            j1 = bisect.bisect_right(at, wall0 + r["end"] + 1000)
                            return any(per_sec[j]["pg"] >= 0.9 for j in range(j0, min(j1, len(per_sec))))

                        def av_busy(r):
                            j0 = bisect.bisect_left(at, wall0 + r["due"] - 2000)
                            j1 = bisect.bisect_right(at, wall0 + r["end"] + 1000)
                            return any(per_sec[j]["av"] > 100 for j in range(j0, min(j1, len(per_sec))))

                        def own_append(r):
                            n = native.get(int(r["ack"]["t"]["v"]))
                            return n[1] - n[0] if n else None

                        apps = [own_append(r) for r in top]
                        apps = [a for a in apps if a is not None]
                        per_read = [r["ack"]["nativeIoStats"]["reads"].get("sql-ms", 0) / r["ack"]["nativeIoStats"]["reads"]["sql"]
                                    for r in g if r["ack"].get("nativeIoStats", {}).get("reads", {}).get("sql")]
                        out[label] = {
                            "busyP99Ms": round(p99, 1) if p99 is not None else None,
                            "slowest1pct": len(top),
                            "shareWithPgCoreAbove0p9": round(sum(map(pg_busy, top)) / max(1, len(top)), 3),
                            "shareNearAutovacuum": round(sum(map(av_busy, top)) / max(1, len(top)), 3),
                            "slowestOwnLogAppendMs": [round(statistics.fmean(apps), 2), round(max(apps), 1)] if apps else None,
                            "msPerSqlRead": [round(statistics.fmean(per_read), 3), round(pct(per_read, .99), 2)] if per_read else None,
                        }
                print(json.dumps(out))


if __name__ == "__main__":
    main()
