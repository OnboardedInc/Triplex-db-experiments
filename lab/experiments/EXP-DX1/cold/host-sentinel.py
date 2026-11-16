# [COLD-1] Why: activity on the Mac's own file system and SSD that does not pass through the virtual machine's disk path:
# a 4 KB write and fsync every INTERVAL ms to a file on the same APFS volume as the VM's disk image.
# If this removes the guest's first-write premium, the sleeping part is APFS or the SSD, not the framework's disk thread.
# Rejected: F_FULLFSYNC every 10 ms as the first test (forces a device cache flush each time; a different, heavier load).
# usage: python3 host-sentinel.py FILE INTERVAL_MS SECONDS [full]
import os, sys, time, json, fcntl
path, every, seconds = sys.argv[1], float(sys.argv[2]) / 1000, float(sys.argv[3])
full = len(sys.argv) > 4 and sys.argv[4] == "full"
fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
block = b"\x03" * 4096
end = time.time() + seconds; n = 0; worst = 0.0; total = 0.0
while time.time() < end:
    t = time.perf_counter()
    os.pwrite(fd, block, (n % 256) * 4096)
    if full: fcntl.fcntl(fd, 51)
    else: os.fsync(fd)
    d = time.perf_counter() - t; total += d; worst = max(worst, d); n += 1
    time.sleep(every)
os.close(fd); os.unlink(path)
print(json.dumps({"sentinel": "host-full" if full else "host", "writes": n, "meanMs": total / max(1, n) * 1000, "maxMs": worst * 1000}))
