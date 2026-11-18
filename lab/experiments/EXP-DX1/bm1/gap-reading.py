"""Read the fixed-gap ACKs from a sealed physical Linux attempt."""

from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import random
import sys


def percentile(values, p):
    return sorted(values)[math.ceil(len(values) * p) - 1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def reading(run):
    names = ("trace-run.json", "trace-summary.json", "head.txt",
             "driver/ns-report.json", "driver/ns-writes.jsonl")
    seals = dict(line.split("  ", 1)[::-1] for line in
                 (run / "SHA256SUMS").read_text().splitlines() if line)
    files = [(run / name).read_bytes() for name in names]
    for name, body in zip(names, files):
        if digest(body) != seals.get(name):
            raise ValueError(f"Changed gap input: {name}")
    manifest, trace, source, report, rows = files
    manifest, trace, report = map(json.loads, (manifest, trace, report))
    source = source.decode().strip()
    config = report["config"]
    # [DX-BM1] Why: use exact terminal ACK rows and the configured no-keep-warm attempt.
    # Rejected: the historical standalone analyzer that requires a Mac sampler and a disk sentinel.
    assert manifest["tag"] == manifest["slot"] == trace["tag"] == run.name
    assert manifest["source"] == trace["source"] == source
    assert manifest["hostPlatform"] == "linux-bare-metal" and manifest["level"] == "full"
    assert trace["complete"] and not trace["errors"] and report["status"] == "DONE"
    assert report["verdictClock"] == "ack/1" and report["traceStartAbsMs"] >= manifest["startedAt"]
    assert report["seed"]["complete"] and report["seed"]["seededSubjects"] == 10000
    assert config["zeroReaders"] and config["readerLadderOnly"] and config["probe10PerS"] == 0
    assert config["idleKeep"] == "none" and report.get("idleKeep") is None
    assert config["idleWarmupCommits"] == 0 and config["idleGapsMs"] == [10, 250, 1000]
    assert report["trace"]["idlePlanSha256"] == report["benchSources"]["lab/bench/lib/idle-plan.ts"]
    primary = [row for row in map(json.loads, rows.splitlines())
               if row["stream"] == "background" and not row["resend"]]
    assert len(primary) == len({row["commandId"] for row in primary}) == 450
    groups = defaultdict(list)
    last_finish = -math.inf
    for row in sorted(primary, key=lambda row: row["startedAt"]):
        assert row["outcome"] == "committed" and not row["expired"] and not row["ackLoss"]
        assert row["facts"] == 10 and not row["idleWarmup"]
        start, ack, end = (row[key] for key in ("startedAt", "ackPublishedAt", "finishedAt"))
        assert manifest["startedAt"] <= row["scheduledAt"] <= start <= ack <= end
        gap = start - last_finish if math.isfinite(last_finish) else None
        groups[row["idleGapMs"]].append((ack - start, ack - row["scheduledAt"], gap))
        last_finish = max(last_finish, end)

    assert sorted(groups) == config["idleGapsMs"] and all(len(xs) == 150 for xs in groups.values())
    rng = random.Random(20261118)
    cohorts = []
    control = [row[0] for row in groups[10]]
    for gap, values in sorted(groups.items()):
        service, offered, actual = zip(*values)
        p50 = percentile(service, 0.5)
        medians = [percentile(rng.choices(service, k=len(service)), 0.5) for _ in range(2000)]
        delta = [median - percentile(rng.choices(control, k=len(control)), 0.5) for median in medians]
        cohorts.append({
            "scheduledGapMs": gap, "n": len(values),
            "actualIdleP50Ms": percentile([x for x in actual if x is not None], 0.5),
            "ackServiceP50Ms": p50, "ackServiceP99Ms": percentile(service, 0.99),
            "offerToAckP50Ms": percentile(offered, 0.5), "offerToAckP99Ms": percentile(offered, 0.99),
            "ackServiceP50Interval90Ms": [percentile(medians, 0.05), percentile(medians, 0.95)],
            "ackServiceP50DeltaFrom10Ms": p50 - percentile(control, 0.5),
            "deltaInterval90Ms": [percentile(delta, 0.05), percentile(delta, 0.95)] if gap != 10 else None,
        })
    return {"tag": run.name, "source": source, "clock": report["verdictClock"], "cohorts": cohorts,
            "inputs": {name: seals[name] for name in names},
            "analysisSha256": digest(Path(__file__).read_bytes()),
            "scope": "Sequential fixed-gap diagnostic; observed percentiles, no performance verdict."}


if __name__ == "__main__":
    print(json.dumps(reading(Path(sys.argv[1]).resolve()), indent=2))
