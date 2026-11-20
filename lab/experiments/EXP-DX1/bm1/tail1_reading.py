"""Check the exact four-minute native rehearsal independently of the TAIL1 report."""

from collections import Counter
from datetime import datetime
import json
import math
from pathlib import Path
import re
import subprocess
import sys

from producer_readings import digest, get

ARCHIVE = "095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb"
LEDGER = "e86d069642e297f4099814b2307570bff1f5d9db753f7929a3c4e4514ea3cdfa"
OFFER = ("seq", "resend", "subject", "kind", "facts", "burst", "active", "correction", "ackLoss")
STAGES = ("scheduledAt", "offeredAt", "startedAt", "transactCalledAt", "transactReturnedAt", "ackPublishedAt")


def reading(out, source, *, diagnostic=False):
    attempt = get(out/"attempt.json")
    report = get(out/"ns-report.json")
    runtime = get(out/"runtime-flags.json")
    cleanup = get(out/"cleanup.json")
    original = get(out/"archive/offers.json")
    replay = report["tailReplay"]
    identity = attempt["identity"]
    assert identity["source"] == source and report["deep"]["identity"] == runtime["identity"] == cleanup["identity"] == identity
    assert identity["people"] == 10000 and identity["slot"] == "tx2-dxscale1-tail1-" + identity["nonce"]
    assert original["archive"] == replay["archive"] == ARCHIVE
    assert original["ledger"] == replay["ledger"] == LEDGER
    assert attempt["seconds"] == replay["seconds"] == 240 and report["verdictClock"] == "ack/1"
    assert replay["primary"] == 5110 and replay["offerCount"] == 5254
    assert cleanup["released"] in ("physical", "native", "s1", "s2", "s3") or attempt["platform"] == "linux"
    assert {r["role"]: r["id"] for r in cleanup["stopped"]} == runtime["ids"]
    for r in cleanup["stopped"]:
        assert not r["oom"] and r["startedAt"] == runtime["readyRuntime"][r["role"]]["startedAt"]
        assert r["restarts"] == runtime["readyRuntime"][r["role"]]["restarts"]
    plans = {(e["seq"], e["resend"]): e for e in original["offers"] if e["offsetMs"] < 240_000}
    assert len(plans) == replay["offerCount"]
    start = report["traceStartAbsMs"]
    bound = get(out/"release.json")
    assert bound["start"] == start and all(bound[k] == identity[k] for k in ("source", "slot", "nonce"))
    assert datetime.fromisoformat(report["startedAt"]).timestamp()*1000 <= start
    raw = out/"ns-writes.jsonl.zst"
    count = {False: Counter(), True: Counter()}
    committed, intervals, positions = [], [[] for _ in range(len(STAGES)-1)], set()
    with subprocess.Popen(["zstd", "-dc", raw], stdout=subprocess.PIPE) as proc:
        for line in proc.stdout:
            row = json.loads(line)
            if row["stream"] != "background":
                continue
            key = (row["seq"], row["resend"])
            offer = plans.pop(key)
            assert all(row[k] == offer[k] for k in OFFER)
            assert abs(row["offsetMs"] - offer["offsetMs"]) < .001
            assert math.isclose(row["scheduledAt"] - start, offer["offsetMs"], abs_tol=.001)
            outcome = "expired" if row["expired"] else row.get("outcome", "missing-outcome")
            count[row["resend"]][outcome] += 1
            if row["resend"] or outcome != "committed":
                continue
            assert row["position"] not in positions
            positions.add(row["position"])
            stamps = [row[k] for k in STAGES]
            for values, before, after in zip(intervals, stamps, stamps[1:]):
                assert math.isfinite(after - before)
                values.append(after-before)
            elapsed = stamps[-1] - stamps[0]
            assert elapsed >= 0 and math.isclose(row["verdictMs"], elapsed, abs_tol=.001)
            committed.append(elapsed)
        assert proc.wait() == 0
    assert not plans and sum(count[False].values()) == 5110 and sum(count[True].values()) == 144
    summary = get(out/("incomplete-measurement.json" if diagnostic else "measurement.json"))
    assert summary["identity"] == identity and summary["archive"] == ARCHIVE
    assert summary["primaryOutcomes"] == count[False] and summary["resendOutcomes"] == count[True]
    assert summary["saves"] == report["receiptCapture"]["matched"] == len(committed)
    assert report["receiptCapture"]["missing"] == report["receiptCapture"]["mismatches"] == 0
    if not diagnostic:
        assert report["status"] == "DONE" and not report["finalizationErrors"]
        oracle = report["oracle"]
        assert oracle["exitCode"] == 0 and oracle["mismatchCount"] == 0
        assert oracle["reads"] == oracle["modelCorrectOnSameReads"] > 0
        assert report["endedAt"] and datetime.fromisoformat(report["endedAt"]).timestamp()*1000 >= start + 240_000
    quantile = lambda values, q: sorted(values)[math.ceil(len(values)*q)-1]
    ack = {name: quantile(committed, p) for name,p in (("p50",.5),("p95",.95),("p99",.99),("p99_9",.999),("max",1))}
    assert ack == summary["ackMs"]
    jvms = {}
    for role in ("gw-w", "gw-r", "tx"):
        logs = sorted((out/"stack"/identity["slot"]/"trace/raw").glob(role+".log*"))
        assert logs and any(re.search(rb"(?m)^\[\d{4}-\d\d-\d\dT", log.read_bytes()) for log in logs)
        jvms[role] = {"collector": summary["gc"][role]["collector"],
                      "cpus": attempt["cpus"][role], "pauseWindow": summary["gc"][role]["window"],
                      "logHashes": {log.name: digest(log) for log in logs}}
    return {"identity": identity, "primary": count[False], "resends": count[True], "ackMs": ack, "roles": jvms,
            "stageP99Ms": {a+"To"+b: quantile(values, .99)
                           for a,b,values in zip(STAGES, STAGES[1:], intervals)},
            "rawSha256": digest(raw), "producer": digest(out/("incomplete-measurement.json" if diagnostic else "measurement.json")),
            "driverStatus": report["status"]}


if __name__ == "__main__":
    assert len(sys.argv) in (3, 4) and (len(sys.argv) == 3 or sys.argv[3] == "--diagnostic")
    print(json.dumps(reading(Path(sys.argv[1]), sys.argv[2], diagnostic=len(sys.argv) == 4), indent=2))
