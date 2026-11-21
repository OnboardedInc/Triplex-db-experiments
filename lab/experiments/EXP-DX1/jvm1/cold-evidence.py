"""Reconstruct offer-offset bins from the archived scorecard and its stage ledger."""
import csv
import gzip
import hashlib
import json
import math
import sys
import tarfile
from collections import defaultdict


def p99(values):
    return round(sorted(values)[math.ceil(len(values) * .99) - 1], 3) if values else ""


def main(scorecard, archive_ledger, checkpoint):
    with tarfile.open(checkpoint, "r") as archive:
        plan = json.load(archive.extractfile("plan.json"))
        assert plan["arms"][0]["id"] == "1-barrier6-S"
        assert [c["label"] for c in plan["arms"][0]["cells"][:2]] == ["r235-alone", "r235-loaded"]
        assert not any(name.endswith("/r235-loaded.json") for name in archive.getnames())
    with tarfile.open(scorecard, "r:gz") as archive:
        arm = json.load(archive.extractfile("campaign/p6-235-loaded/arm.json"))
        raw = archive.extractfile("campaign/p6-235-loaded/operations.json").read()
    assert hashlib.sha256(raw).hexdigest() == arm["observationsSha256"]
    assert arm["p6"]["durationSeconds"] == 90
    saves = json.loads(raw)["writes"]
    assert len(saves) == 21_150 and len({s["id"] for s in saves}) == len(saves)
    with gzip.open(archive_ledger, "rt") as stream:
        ledger = {}
        for row in map(json.loads, stream):
            if row["workload"] != [235, "loaded"]:
                continue
            assert all(row[k] == arm[k] for k in ("source", "slot", "attempt"))
            assert row["id"] not in ledger
            ledger[row["id"]] = row
    seconds = defaultdict(list)
    for save in saves:
        assert save["status"] == "acked"
        seconds[math.floor((save["due"] - arm["start"]) / 1000)].append(save)
    assert sorted(seconds) == list(range(90))

    # [DX-JVM1] Why: join the stage decomposition by operation and align outer latency to scheduled offers.
    # Rejected: dividing p99s or reusing the earlier run's numbers as if recorded in the later checkpoint.
    stages = ("older_fair_turn", "tx_queue", "prepare", "apply", "append")
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(["offer_second", "barrier6_raw", "scorecard_acks", "scorecard_ack_p99_ms", "sender_queue_p99_ms",
                     "scorecard_excess_save_ms", *[s + "_excess_ms" for s in stages], "other_excess_ms",
                     "older_tx_queue_ms", "older_prepare_ms", "older_apply_ms", "older_append_ms",
                     "sql_samples", "sql_reads_per_sampled_save", "mean_sql_ms", "mean_decode_ms"])
    seen = set()
    for second in range(150):
        rows = seconds[second]
        if not rows:
            writer.writerow([second, "absent", *([""] * 17)])
            continue
        latency = [s["end"] - s["due"] for s in rows]
        slow = [ledger[s["id"]] for s, ms in zip(rows, latency) if ms > 50]
        for s in slow:
            seen.add(s["id"])
            assert abs(sum(s["excessMs"].values()) - (s["latencyMs"] - 50)) < .01
        excess = sum(s["latencyMs"] - 50 for s in slow)
        split = [sum(s["excessMs"].get(stage, 0) for s in slow) for stage in stages]
        older = [sum(s["olderTurnCriticalMs"].get(stage, 0) for s in slow) for stage in stages[1:]]
        reads = [s["stage"]["nativeIoStats"]["reads"] for s in rows if s["stage"].get("nativeIoStats") is not None]
        means = [round(sum(r.get(k, 0) for r in reads) / len(reads), 4) if reads else ""
                 for k in ("sql", "sql-ms", "deserialize-ms")]
        writer.writerow([second, "absent", len(rows), p99(latency), p99([s["dispatched"] - s["due"] for s in rows]),
                         round(excess, 3), *[round(x, 3) for x in split], round(excess - sum(split), 3),
                         *[round(x, 3) for x in older], len(reads), *means])
    assert seen == ledger.keys()


if __name__ == "__main__":
    main(*sys.argv[1:])
