# [COLD-1] Why: the same first-write-after-a-gap measurement on the Mac itself, with no virtual machine in the path.
# If the Mac shows the step between 50 and 100 ms too, the cause is below the Virtualization framework (APFS, the SSD).
# Rejected: inferring the host's behaviour from guest timings alone.
# usage: python3 host-disk.py FILE REPS [GAPS_CSV] [fsync|full|none]   prints one JSON line
import os, sys, time, json, random, fcntl
path, reps = sys.argv[1], int(sys.argv[2])
gaps = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "0,5,10,20,30,40,50,60,70,80,100,150,250,500,1000,2000").split(",")]
mode = sys.argv[4] if len(sys.argv) > 4 else "fsync"
size = 64 * 1024 * 1024
fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
if os.fstat(fd).st_size != size:
    for i in range(64): os.pwrite(fd, b"\0" * (1024 * 1024), i * 1024 * 1024)
    os.fsync(fd)
def sync():
    if mode == "full": fcntl.fcntl(fd, 51)
    elif mode == "fsync": os.fsync(fd)
first, second = b"\x07" * 16384, b"\x09" * 8192
pos = 0
for _ in range(200):
    os.pwrite(fd, second, pos); sync(); pos = (pos + 8192) % size
random.seed(7); rows = []
for r in range(reps):
    g = gaps[:]; random.shuffle(g)
    for gap in g:
        if gap: time.sleep(gap / 1000)
        t0 = time.perf_counter(); os.pwrite(fd, first, pos); sync(); pos = (pos + 16384) % size
        t1 = time.perf_counter(); os.pwrite(fd, second, pos); sync(); pos = (pos + 8192) % size
        t2 = time.perf_counter()
        rows.append((gap, (t1 - t0) * 1000, (t2 - t1) * 1000))
os.close(fd); os.unlink(path)
def q(xs, p):
    s = sorted(xs); return round(s[min(len(s) - 1, int(p * len(s)))], 4)
print(json.dumps({"mode": mode, "reps": reps, "summary": [{"gap": g, "n": sum(1 for r in rows if r[0] == g), "firstP10": q([r[1] for r in rows if r[0] == g], .1), "firstP50": q([r[1] for r in rows if r[0] == g], .5), "firstP90": q([r[1] for r in rows if r[0] == g], .9), "secondP50": q([r[2] for r in rows if r[0] == g], .5)} for g in gaps]}))
