#!/usr/bin/env python3
# [DX-API1] The floor of reader CPU per API call and the sizing it gives (API-CALL-READS.md section 10).
#   python3 floor.py WARM_COUNTS COLD_COUNTS WARM_CALIBRATION [COLD_CALIBRATION]
# Mac CPU per call = the mean of the 16- and 64-caller cells (one-caller cells carry JIT and background threads); the
# server = Mac x f, f = 1.53 ms / the same run's 16-caller calibration exchange (the 2026-11-23 server figure for the
# same request). Random subjects on the server: the re-read CPU + storage loads x 0.86 ms (RD5), loads per call =
# distinct subjects x 2.7 (central; section 5). Cores for a p99 bar with N calls in flight (closed loop): p99 = 1.7 x
# N x CPU / (cores x 0.9), so cores = 1.7 x N x CPU / (0.9 x bar), never below what keeps one call's alone time under
# the bar.
import json, sys

warm = json.load(open(sys.argv[1])); cold = json.load(open(sys.argv[2]))
cal = json.load(open(sys.argv[3])) + (json.load(open(sys.argv[4])) if len(sys.argv) > 4 else [])
ex = [r for r in cal if r["reader"] == "warm" and r["callers"] == 16][0]
f = 1.53 / ex["cpuMsPerCall"]
def cpu(rows, shape, port):
    xs = [r["cpuMsPerCall"] for r in rows if r["shape"] == shape and r["port"] == port and r["callers"] in (16, 64)]
    return sum(xs) / len(xs) if xs else None
def one(rows, shape, port, key):
    xs = [r[key] for r in rows if r["shape"] == shape and r["port"] == port and r["callers"] == 1]
    return xs[0] if xs else None
SUBJECTS = {"subject-list": 50}
steps = [("today", "today", "one HTTP read per entity"), ("batch1", "batch1", "one-request batch of entity reads"),
         ("batchDefs", "batchDefs", "the same with the definitions cache")]
out = {"f": round(f, 3), "shapes": {}}
for shape in sorted({r["shape"] for r in warm}):
    world = shape + "-world" if any(r["shape"] == shape + "-world" for r in warm) else None
    if shape.endswith("-world"): continue
    row = {}
    for label, port, _ in steps:
        row[label] = cpu(warm, shape, port)
    if world:
        row["world"] = cpu(warm, world, "batch1"); row["worldDefs"] = cpu(warm, world, "batchDefs")
    row["reads"] = one(warm, shape, "today", "reads"); row["requestsToday"] = one(warm, shape, "today", "trips")
    out["shapes"][shape] = {k: (round(v, 2) if isinstance(v, float) else v) for k, v in row.items()}
def sizing(cpu_ms, alone_ms):
    res = {"callsPerSecondPerCore": round(0.9 * 1000 / cpu_ms)}
    for n in (64, 256):
        for bar in (50, 200):
            cores = 1.7 * n * cpu_ms / (0.9 * bar)
            res[f"cores{n}@{bar}"] = None if alone_ms * 1.7 > bar else round(max(cores, 1), 1)
    return res
best = out["shapes"]["subject-page"]
# The floor arms: the subject page through each step, re-read and random, on the server.
floors = {}
for label in ("today", "batch1", "world", "worldDefs"):
    m = best[label]
    s_warm = m * f
    loads = 2.7
    s_cold = s_warm + loads * 0.86
    alone_w = s_warm / 3 + 0.3 if label == "today" else s_warm + 0.3
    alone_c = alone_w + (loads * 1.2 if label == "today" else 2 * 1.2) + (s_cold - s_warm) / (3 if label == "today" else 1)
    floors[label] = {"macCpuMs": round(m, 2), "serverCpuMsReread": round(s_warm, 2), "serverCpuMsRandom": round(s_cold, 2),
                     "aloneMsReread": round(alone_w, 1), "aloneMsRandom": round(alone_c, 1),
                     "reread": sizing(s_warm, alone_w), "random": sizing(s_cold, alone_c)}
out["subjectPageFloor"] = floors
print(json.dumps(out, indent=2))
