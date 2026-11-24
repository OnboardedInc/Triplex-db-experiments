#!/usr/bin/env python3
# [DX-API1] Markdown tables of the Mac counts: python3 summarize.py COUNTS_JSON [COUNTS_JSON ...]
import json, sys

rows = []
for f in sys.argv[1:]:
    rows += json.load(open(f))
shapes = []
for r in rows:
    if r["shape"] not in shapes and r["shape"] != "exchange-of-8":
        shapes.append(r["shape"])
def get(shape, port, reader, callers):
    for r in rows:
        if r["shape"] == shape and r["port"] == port and r["reader"] == reader and r["callers"] == callers:
            return r
    return None
def n(x, d=1):
    if x is None: return "—"
    return f"{x:,.{d}f}"
for reader in ("warm", "cold"):
    if not any(r["reader"] == reader for r in rows): continue
    print(f"\n**{reader}** (one caller; reads, requests and loads per call; reader CPU per call, ms; wall p50 / p99, ms)\n")
    print("| Shape | Reads | Requests today / pinned / loader / batch | Storage loads today / loader / batch | CPU today / pinned / loader / batch | Wall p50 today / loader / batch | Wall p99 today / loader / batch |")
    print("| --- | ---: | --- | --- | --- | --- | --- |")
    for s in shapes:
        t, p, l, b = (get(s, x, reader, 1) for x in ("today", "pinned", "loader", "batch1"))
        if not t: continue
        print(f"| {s} | {n(t['reads'])} | {n(t['trips'])} / {n(p and p['trips'])} / {n(l and l['trips'])} / {n(b and b['trips'])} | "
              f"{n(t['loads'],2)} / {n(l and l['loads'],2)} / {n(b and b['loads'],2)} | "
              f"{n(t['cpuMsPerCall'])} / {n(p and p['cpuMsPerCall'])} / {n(l and l['cpuMsPerCall'])} / {n(b and b['cpuMsPerCall'])} | "
              f"{n(t['wallMsP50'])} / {n(l and l['wallMsP50'])} / {n(b and b['wallMsP50'])} | {n(t['wallMsP99'])} / {n(l and l['wallMsP99'])} / {n(b and b['wallMsP99'])} |")
    for callers in (16, 64):
        if not any(r["reader"] == reader and r["callers"] == callers for r in rows): continue
        print(f"\n**{reader}, {callers} callers** (calls/s; reader CPU per call, ms; wall p50 / p99, ms)\n")
        print("| Shape | Calls/s today / loader / batch | CPU today / loader / batch | p50 today / loader / batch | p99 today / loader / batch |")
        print("| --- | --- | --- | --- | --- |")
        for s in shapes:
            t, l, b = (get(s, x, reader, callers) for x in ("today", "loader", "batch1"))
            if not t: continue
            print(f"| {s} | {n(t['callsPerSecond'])} / {n(l and l['callsPerSecond'])} / {n(b and b['callsPerSecond'])} | "
                  f"{n(t['cpuMsPerCall'])} / {n(l and l['cpuMsPerCall'])} / {n(b and b['cpuMsPerCall'])} | "
                  f"{n(t['wallMsP50'])} / {n(l and l['wallMsP50'])} / {n(b and b['wallMsP50'])} | {n(t['wallMsP99'])} / {n(l and l['wallMsP99'])} / {n(b and b['wallMsP99'])} |")
for r in rows:
    if r["shape"] == "exchange-of-8":
        print(f"\nexchange of 8 ({r['reader']}): CPU {r['cpuMsPerCall']:.3f} ms, loads {r['loads']}, p50 {r['wallMsP50']:.2f} ms")
