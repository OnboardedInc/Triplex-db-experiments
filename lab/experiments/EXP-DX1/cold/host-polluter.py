# [COLD-1] Why: a controlled amount of other memory traffic on the Mac. Each step copies MB megabytes once (about twice
# that many megabytes pass through the processor caches), then sleeps PERIOD ms. If the commit path goes cold because
# other work on the Mac pushes its lines out of the shared cache, the cache probe's first-pass cost must rise at
# shorter gaps as this traffic rises.
# Rejected: a CPU-only load (it does not replace cache contents).
# usage: python3 host-polluter.py MB PERIOD_MS SECONDS   prints one JSON line
import json, sys, time
mb, period, seconds = int(sys.argv[1]), float(sys.argv[2]) / 1000, float(sys.argv[3])
a, b = bytearray(mb << 20), bytearray(mb << 20)
end = time.time() + seconds; n = 0; busy = 0.0
while time.time() < end:
    t = time.perf_counter(); b[:] = a; busy += time.perf_counter() - t; n += 1
    if period > 0: time.sleep(period)
print(json.dumps({"polluter": {"mb": mb, "periodMs": period * 1000, "copies": n, "busySeconds": round(busy, 3), "seconds": seconds}}))
