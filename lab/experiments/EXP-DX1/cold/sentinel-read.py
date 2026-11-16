# [COLD-1] Why: a request that reaches the host's disk path without writing: a 4 KB O_DIRECT read every INTERVAL ms.
# If this alone removes the first-write premium, the sleeping part is the path to the host, not the SSD's write side.
# Rejected: a buffered read (served from the guest page cache; never leaves the guest).
# usage: python3 sentinel-read.py FILE INTERVAL_MS
import mmap, os, signal, sys, time, json
path, every = sys.argv[1], float(sys.argv[2]) / 1000
size = 64 * 1024 * 1024
if not os.path.exists(path) or os.path.getsize(path) != size:
    with open(path, "wb") as f:
        for _ in range(64): f.write(b"\x05" * (1024 * 1024))
        f.flush(); os.fsync(f.fileno())
fd = os.open(path, os.O_RDONLY | os.O_DIRECT)
buf = mmap.mmap(-1, 4096)
n = 0
def stop(*_):
    print(json.dumps({"sentinel": "read", "reads": n})); sys.exit(0)
signal.signal(signal.SIGTERM, stop)
while True:
    os.preadv(fd, [buf], (n * 4096 * 37) % size)
    n += 1
    time.sleep(every)
