#!/usr/bin/env python3
"""VM wake-latency probe. No containers, no database.

Question: does a fixed, pure-CPU unit of work take longer when the vCPU was idle just before it?
DX-B6 saw every commit component (even command construction in the driver) take about 10x longer at
one commit per second than back-to-back, which points at the vCPU, not at Datomic.

Arms (same unit of work, same pinned CPU):
  dense    back-to-back
  gap      sleep GAP seconds before each unit (default 1.0 and 0.05)
Run twice by the wrapper: once as is, once with SCHED_IDLE spinners on every CPU (run.sh --spin).
Prints JSON: per arm p50/p99 of the unit's wall time in ms, and the sleep overshoot in ms.
"""
import json, os, sys, time

def unit(n=60000):
    s = 0
    for i in range(n):
        s += i * i & 7
    return s

def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(p * len(xs)))]

def arm(gap, count):
    work, over = [], []
    for _ in range(count):
        if gap:
            a = time.perf_counter(); time.sleep(gap); over.append((time.perf_counter() - a - gap) * 1e3)
        a = time.perf_counter(); unit(); work.append((time.perf_counter() - a) * 1e3)
    out = {"count": count, "workP50Ms": round(pct(work, .5), 3), "workP99Ms": round(pct(work, .99), 3)}
    if over:
        out |= {"sleepOvershootP50Ms": round(pct(over, .5), 3), "sleepOvershootP99Ms": round(pct(over, .99), 3)}
    return out

if __name__ == "__main__":
    cpu = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    os.sched_setaffinity(0, {cpu})
    for _ in range(200): unit()
    res = {"cpu": cpu, "load1": os.getloadavg()[0], "dense": arm(0, 400), "gap50ms": arm(0.05, 100), "gap1s": arm(1.0, 25)}
    print(json.dumps(res))
