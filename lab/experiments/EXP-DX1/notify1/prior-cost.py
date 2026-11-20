"""Recover the original write, payload and scheduled-pause costs from the published evidence."""
import gzip
import hashlib
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
index = Path(__file__).with_name("SHA256SUMS")
sums = {name: sha for sha, name in (line.split("  ", 1) for line in index.read_text().splitlines())}

def read(file):
    b = (root / file).read_bytes()
    assert hashlib.sha256(b).hexdigest() == sums[file]
    return json.loads(gzip.decompress(b) if file.endswith(".gz") else b)

for name in ["one-paced", "ten-low-duty", "ten-confirm-recovery", "deep-preflight4/notice-preflight"]:
    arm = read(name + "/dispatch.json")
    archive = read(name + "/observed.json.gz")
    metrics = arm["dispatch"]
    first, count = arm["proof"]["eventCounts"][:2]
    assert count == metrics["deliveries"] and archive["originalScope"] == arm["scope"]
    deliveries = archive["effects"][first:first + count]
    assert len(deliveries) == count and len(archive["effects"]) == arm["proof"]["effects"]
    size = sum(len(json.dumps(d["payload"], separators=(",", ":"), ensure_ascii=False).encode()) for d in deliveries)
    pause = (metrics["visits"] + metrics["packets"]) * arm["gapMs"]
    print(json.dumps(dict(arm=name,notices=count,seconds=arm["duration"]/1000,scheduledPauseMs=pause,
                          pauseFraction=pause/arm["duration"],sourceTxPerNotice=metrics["sourceWrites"]/count,
                          sinkTxPerNotice=metrics["sinkWrites"]/count,evaluationsPerNotice=metrics["evaluations"]/count,
                          payloadBytesPerNotice=size/count,recordedPhases=metrics)))
