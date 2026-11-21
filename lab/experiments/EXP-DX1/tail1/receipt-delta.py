#!/usr/bin/env python3
"""Compare HTTP calls and ACK times on offers committed in both receipt arms."""

from collections import Counter
from contextlib import contextmanager
from hashlib import sha256
import argparse
import json
from pathlib import Path
import subprocess
import tarfile

from archive import OFFER_KEYS, quantiles, write_json
from measure import load


@contextmanager
def trace_files(directory):
    raw = directory / "raw"
    if raw.is_dir():
        with (raw / "gw-w.jsonl").open("rb") as writer, (raw / "gw-r.jsonl").open("rb") as reader:
            yield [("gw-w", writer), ("gw-r", reader)]
        return
    manifest = dict(line.split("  ", 1)[::-1]
                    for line in (directory / "raw.SHA256SUMS").read_text().splitlines())
    decoder = subprocess.Popen(["zstd", "-dc", directory / "raw.tar.zst"],
                               stdout=subprocess.PIPE)
    with decoder, tarfile.open(fileobj=decoder.stdout, mode="r|") as bundle:
        # [DX-TAIL1] Why: bind the unpacked request roots to the timed attempt's trace.
        # Rejected: comparing counts from arbitrary files with matching basenames.
        def checked():
            for item in bundle:
                if item.name not in ("raw/gw-w.jsonl", "raw/gw-r.jsonl"):
                    continue
                assert item.isfile()
                digest = sha256()
                with bundle.extractfile(item) as stream:
                    def lines():
                        for line in stream:
                            digest.update(line)
                            yield line
                    yield Path(item.name).stem, lines()
                assert digest.hexdigest() == manifest[item.name]
        yield checked()
        while decoder.stdout.read(1024 * 1024):
            pass
        assert decoder.wait() == 0


def read_arm(directory, enabled):
    attempt = load(directory / "attempt.json")
    source = load(directory / "source.json")
    measurement = load(directory / "measurement.json")
    report = load(directory / "ns-report.json")
    identity = attempt["identity"]
    assert identity == source["identity"] == measurement["identity"] == report["deep"]["identity"]
    assert (attempt["collector"], attempt["cpus"]["gw-w"], attempt["seconds"]) == ("G1", "1", 240)
    assert attempt["receiptPredecessors"] is enabled
    assert report["status"] == "DONE" and report["oracle"]["mismatchCount"] == 0
    writes = {}
    commits = {}
    with subprocess.Popen(["zstd", "-dc", directory / "ns-writes.jsonl.zst"],
                          stdout=subprocess.PIPE) as decoder:
        for line in decoder.stdout:
            row = json.loads(line)
            if row["stream"] != "background" or row["resend"]:
                continue
            key = row["seq"]
            assert key not in writes
            writes[key] = [row[column] for column in OFFER_KEYS]
            if row.get("outcome") == "committed" and not row["expired"]:
                assert row["verdictClock"] == "ack/1"
                assert round(row["ackPublishedAt"] - row["scheduledAt"] - row["verdictMs"], 3) == 0
                assert row["traceId"] not in commits
                commits[row["traceId"]] = row
        assert decoder.wait() == 0
    assert len(writes) == 5110
    assert len(commits) == measurement["saves"] == report["receiptCapture"]["matched"]
    counts = {trace: Counter() for trace in commits}
    roots = set()
    roles = set()
    with trace_files(directory / "stack" / identity["slot"] / "trace") as sources:
        for role, lines in sources:
            assert role not in roles
            roles.add(role)
            for line in lines:
                span = json.loads(line)
                trace = span.get("traceId")
                if trace not in commits or not span["name"].startswith("gateway /"):
                    continue
                assert (span["source"], span["slot"], span["run"], span["process"]) == (
                    identity["source"], identity["slot"], identity["slot"], role)
                assert span["root"] not in roots
                roots.add(span["root"])
                counts[trace][span["name"].rsplit("/", 1)[-1]] += 1
    assert roles == {"gw-w", "gw-r"}
    assert all(item["transact"] for item in counts.values())
    assert sum(counts.values(), Counter()) == measurement["gatewayRequests"]
    return identity, source["offers"], writes, {
        row["seq"]: (row, counts[trace]) for trace, row in commits.items()
    }


def summary(commits, keys):
    counts = sum((commits[seq][1] for seq in keys), Counter())
    rows = [commits[seq][0] for seq in keys]
    tail = sorted(rows, key=lambda row: row["verdictMs"], reverse=True)[:50]
    return {"saves": len(rows), "ackMs": quantiles([row["verdictMs"] for row in rows]),
            "requests": dict(counts), "requestsPerSave": counts.total() / len(rows),
            "beginPerSave": counts["begin"] / len(rows),
            "topFiftyBeforeDispatchMs": quantiles([row["startedAt"] - row["scheduledAt"] for row in tail])}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("control", type=Path)
    parser.add_argument("receipt", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    left, left_source, left_offers, control = read_arm(args.control, False)
    right, right_source, right_offers, receipt = read_arm(args.receipt, True)
    assert left["nonce"] != right["nonce"] and left["slot"] != right["slot"]
    assert left_source == right_source and left_offers == right_offers
    shared = sorted(control.keys() & receipt.keys())
    assert shared
    write_json(args.output, {
        "controlIdentity": left, "receiptIdentity": right,
        "sharedOffers": len(shared), "sharedOfferSeqSha256": sha256(json.dumps(shared).encode()).hexdigest(),
        "analyzerSha256": sha256(Path(__file__).read_bytes()).hexdigest(),
        "controlAll": summary(control, sorted(control)),
        "receiptAll": summary(receipt, sorted(receipt)),
        "controlOnSharedOffers": summary(control, shared),
        "receiptOnSharedOffers": summary(receipt, shared)})
