"""Join original Mac peer and transactor events. Shared timestamps are guest wall time."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

STAMP = "%Y-%m-%d %H:%M:%S,%f"
UUID = re.compile(r'#uuid "([0-9a-f-]{36})"')
NATIVE_T = re.compile(r":t (\d+)(?=[,}])")


def ms(line):
    return datetime.strptime(line[:23], STAMP).timestamp() * 1000


def quantiles(samples):
    a = sorted(samples)
    return [round(a[len(a) // 2], 3), round(a[(len(a) * 99 + 99) // 100 - 1], 3)]


def analyze(root):
    peer = {}
    loads = []
    for line in (root / "rung-1.log").open():
        if line.startswith("DX_AGE1 "):
            row = json.loads(line[len("DX_AGE1 "):])
            if row["event"] == "load-segment":
                loads.append(row)
        elif ":event :peer/transact," in line:
            uuid = UUID.search(line)[1]
            phase = "start" if ":phase :start," in line else "end"
            record = peer.setdefault(uuid, {})
            assert phase not in record
            record[phase] = ms(line)
    assert sum(row["to"] - row["from"] for row in loads) == 15000
    start_t = loads[0]["t"] - loads[0]["to"]
    end_t = loads[-1]["t"]
    rows = []
    for line in (root / "tx.log").open():
        if ":event :tx/process," not in line:
            continue
        t = int(NATIVE_T.search(line)[1])
        if not start_t < t <= end_t:
            continue
        uuid = UUID.search(line)[1]
        if uuid not in peer:
            continue
        start, end = peer[uuid]["start"], peer[uuid]["end"]
        applied = ms(line)
        assert start <= applied <= end
        apply_ms = float(re.search(r":apply-msec ([\d.]+)", line)[1])
        process_ms = float(re.search(r":event :tx/process, :msec ([\d.]+)", line)[1])
        rows.append((t, start, applied, end, apply_ms, process_ms))
    assert sorted(r[0] for r in rows) == list(range(start_t + 1, end_t + 1))
    # [DX-AGE1] Why: overlap is merged before comparing wall stages.
    # Rejected: summing concurrent request latency as transactor wall occupancy.
    pending_until = 0
    pending_ms = 0
    for _, start, _, end, _, _ in sorted(rows, key=lambda x: x[1]):
        pending_ms += max(0, end - max(start, pending_until))
        pending_until = max(pending_until, end)
    age_ms = sum(r["seconds"] for r in loads) * 1000
    return {
        "attempt": loads[0]["attempt"],
        "joined": len(rows),
        "recordsPerSecond": 300000 / (age_ms / 1000),
        "ageSeconds": age_ms / 1000,
        "peerPendingSeconds": round(pending_ms / 1000, 3),
        "noPeerPendingSeconds": round((age_ms - pending_ms) / 1000, 3),
        "perTxP50P99Ms": {
            "peerToNativeReport": quantiles([applied - start for _, start, applied, _, _, _ in rows]),
            "nativeApply": quantiles([apply for _, _, _, _, apply, _ in rows]),
            "nativeProcess": quantiles([process for _, _, _, _, _, process in rows]),
            "nativeReportToPeer": quantiles([end - applied for _, _, applied, end, _, _ in rows]),
            "peerEndToEnd": quantiles([end - start for _, start, _, end, _, _ in rows]),
        },
    }


if __name__ == "__main__":
    print(json.dumps([analyze(Path(p)) for p in sys.argv[1:]], indent=2))
