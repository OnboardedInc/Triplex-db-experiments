#!/usr/bin/env python3
"""Attribute observed delay in the sealed BM1 thin/deep study."""

import argparse
from bisect import bisect_left, bisect_right
from collections import Counter, defaultdict
import csv
from datetime import datetime
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
from statistics import median
import subprocess
import tarfile
from uuid import UUID

from archive import quantiles, write_json


TRANSFER = "acfd632b88e61d3f5bd39c872097a7111bb03f1820babdc57c20ce6d7f3ee423"
POPULATIONS = ("thin", "deep", "deep", "thin")
MEMBER = re.compile(r"results/arm-([1-4])/(writer\.jsonl|engines/([^/]+)/trace/raw/(gw-[wr]\.jsonl|tx\.jsonl|node-\d+-0\.jsonl\.gz))$")
KINDS = ("senderMs", "gatewayOutsideAwaitMs", "ownSqlMs", "evaluationOtherMs", "peerWaitUnassignedMs", "clientAndWireResidualMs")
AWAIT = "peer.transact-await (includes order/network/storage)"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sealed(path, proof):
    data = path.read_bytes()
    assert len(data) == proof["bytes"] and sha(data) == proof["sha256"], path.name
    return data


def bundle(root):
    transfer = (root / "TRANSFER.json").read_bytes()
    assert sha(transfer) == TRANSFER
    proof = json.loads(transfer)
    assert (proof["item"], proof["attempt"], proof["measurementState"]) == (9, 1, "recorded")
    index = (root / "summary-members.json").read_bytes()
    assert sha(index) == proof["summaryMembersSha256"]
    index = json.loads(index)

    def read(name):
        return sealed(root / name, index[name])

    request = read("control/request.json")
    terminal = read("control/terminal.json")
    assert sha(request) == proof["requestSha256"] and sha(terminal) == proof["terminalSha256"]
    request, terminal = json.loads(request), json.loads(terminal)
    assert all(request[k] == terminal[k] == proof[k] for k in ("item", "attempt", "source"))
    assert terminal["ended"] == proof["ended"] and terminal["clean"] is True
    terminal_at = datetime.fromisoformat(terminal["ended"]).timestamp()
    comparison = json.loads(read("results/comparison.json"))
    assert comparison["source"] == proof["source"] and comparison["study"] == "thin-deep"
    assert comparison["small"] is False and len(comparison["arms"]) == 4
    raw = root / proof["raw"]["name"]
    sealed(raw, proof["raw"])
    traces, inventory = defaultdict(dict), []
    # [DX-TAIL1] Why: retain exactly the four members of the measured comparison.
    # Rejected: treating a preflight trace, neighboring attempt, or omitted archive member as measured.
    with subprocess.Popen(["zstd", "-qdc", raw], stdout=subprocess.PIPE) as decoder:
        with tarfile.open(fileobj=decoder.stdout, mode="r|") as tar:
            for member in tar:
                if not member.isfile():
                    continue
                inventory.append(member.name)
                match = MEMBER.fullmatch(member.name)
                if not match:
                    continue
                index_number = int(match[1])
                role = match[4] or match[2]
                assert role not in traces[index_number]
                if match[3]:
                    assert match[3] == comparison["arms"][index_number - 1]["arm"]["slot"]
                assert request["start"] - 2 <= member.mtime <= terminal_at + 2
                data = tar.extractfile(member).read()
                traces[index_number][role] = (data, sha(data))
        while decoder.stdout.read(1024 * 1024):
            pass
        assert decoder.wait() == 0
    assert len(inventory) == len(set(inventory)) == proof["rawFiles"]
    return proof, request, terminal_at, comparison, read, traces, inventory


def records(data, allow_cut=False):
    lines = data.splitlines(keepends=True)
    rows = []
    for i, line in enumerate(lines):
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            assert allow_cut and i == len(lines) - 1 and not line.endswith(b"\n")
            return rows, 1
    return rows, 0


def bound(row, identity, process=None):
    assert row["source"] == identity["source"] and row["slot"] == row["run"] == identity["slot"]
    if process:
        assert row["process"] == process


def reading(rows):
    measurements = (
        "ackMs", "outsideEvalMs", "nativeEvaluationMs", "peerWaitUnassignedMs",
        "ownSqlMs", "deserializeMs", "senderMs", "gatewayMaxUnobservedGapMs",
        "olderNativeWritesStillAwaiting", "nodeGcBeforeCallMs", "earlierSqlOverlapLowerBoundMs",
    )
    distributions = {}
    for key in measurements:
        q = quantiles([row[key] for row in rows])
        distributions[key] = [q["p50"], q["p99"], q["max"]]
    return {
        "n": len(rows),
        "dominantObservedInterval": dict(Counter(row["dominant"] for row in rows)),
        "p50P99Max": distributions,
        "ownSqlReadCountPositive": sum(row["ownSqlReads"] > 0 for row in rows),
        "writerSingleGapShorterThanResidual": sum(row["gatewayMaxUnobservedGapMs"] < row["peerWaitUnassignedMs"] for row in rows),
        "withEarlierNativeReplyOutstanding": sum(row["olderNativeWritesStillAwaiting"] > 0 for row in rows),
        "withEarlierNativeSqlOverlap": sum(row["earlierSqlOverlapLowerBoundMs"] > 0 for row in rows),
    }


def joined_arm(number, sample, read, traces, request, terminal_at):
    directory = f"results/arm-{number}/"
    identity = json.loads(read(directory + "identity.json"))
    assert identity == sample["arm"] and identity["source"] == request["source"]
    assert identity["slot"] == f"tx2-dxscale1-w1-{request['tag']}-{number}"
    assert str(UUID(identity["nonce"])) == identity["nonce"] and identity["readers"] is False
    assert sample["population"] == identity["population"] == POPULATIONS[number - 1]
    assert sample["people"] == 10000 and sample["seconds"] == 45 and sample["rate"] == 39.4
    assert sample["rowsPerOffer"] == [5, 5]
    assert all(json.loads(read(directory + key)) == sample for key in ("summary.json", "field-output.json"))
    assert json.loads(read(directory + "durability.json"))["settings"] == "on|on|on"
    tape = read(directory + "offers.json")
    assert sha(tape.removesuffix(b"\n")) == sample["tapeSha256"]
    tape = json.loads(tape)
    node_file, = [name for name in traces if name.startswith("node-")]
    assert set(traces) == {"writer.jsonl", "gw-w.jsonl", "gw-r.jsonl", "tx.jsonl", node_file}
    assert traces["writer.jsonl"][1] == sample["writerSha256"]
    writes, _ = records(traces["writer.jsonl"][0])
    writes.sort(key=lambda row: row["ordinal"])
    assert len(tape) == len(writes) == 1773 == sample["offers"] == sample["seedRootsChecked"]
    for i, (offer, row) in enumerate(zip(tape, writes)):
        assert offer["i"] == row["ordinal"] == i and offer["subject"] == i * 7919 % 10000
        assert math.isclose(offer["due"], i * 1000 / 39.4, abs_tol=1e-6, rel_tol=0)
        assert row["due"] == offer["due"] and row["entity"] == f"pl:{offer['subject']:08d}"
        assert row["id"] == f"bm1-matched-{i:06d}" and row["disposition"] == "ack"
        assert len(set(row["old"] + row["fresh"])) == 10
        assert row["values"] == [f"{row['id']}-{column}" for column in range(5)]
    assert len({row["entity"] for row in writes}) == len(writes)
    assert len({row["traceId"] for row in writes}) == len({row["t"] for row in writes}) == len(writes)
    assert sorted(row["pos"] for row in writes) == list(range(sample["seedCut"] + 1, sample["seedCut"] + 1 + len(writes)))
    assert sha(json.dumps([row["ints"] for row in writes], separators=(",", ":")).encode()) == sample["intentSha256"]
    assert quantiles([row["ackMs"] for row in writes])["p99"] == sample["ms"]["p99"]

    gateway, partial = records(traces["gw-w.jsonl"][0], allow_cut=True)
    reader, reader_partial = records(traces["gw-r.jsonl"][0])
    tx, tx_partial = records(traces["tx.jsonl"][0])
    node, node_partial = records(gzip.decompress(traces[node_file][0]))
    boots = set()
    for role, rows in (("gw-w", gateway), ("gw-r", reader), ("tx", tx), (node_file.split("-0.jsonl")[0], node)):
        for row in rows:
            bound(row, identity, role)
            if isinstance(row.get("clock"), dict):
                assert row["clock"]["domain"] == "linux-monotonic"
                boots.add(row["clock"]["bootId"])
    boot, = boots
    by_native, by_node = defaultdict(list), defaultdict(list)
    for row in gateway:
        if row.get("name") == "gateway /v1/db/{db}/transact" and row["attributes"].get("status") == 200:
            by_native[row["traceId"], str(row["attributes"].get("datomicT"))].append(row)
    for row in node:
        if row.get("name") == "bm1.field-cut" and row["type"] == "request":
            by_node[row["traceId"]].append(row)
    assert len(by_node) == len(writes)
    node_gc = [(row["start"], row["end"]) for row in node if row.get("name") == "node.gc"]
    marks = sorted({span[key] for row in gateway for span in (row, *row.get("spans", ()))
                    if "start" in span for key in ("start", "end")})
    fits = [by_node[row["traceId"]][0]["start"] - row["started"] for row in writes]
    origin = median(fits)
    assert max(abs(value - origin) for value in fits) < 0.05
    assert request["start"] * 1000 <= origin < origin + 45000 <= terminal_at * 1000
    result, db_hashes = [], set()
    for row in writes:
        g, = by_native[row["traceId"], row["t"]]
        n, = by_node[row["traceId"]]
        assert n["attributes"]["commandId"] == row["id"]
        trace_to_ack = origin + row["due"] + row["ackMs"] - n["end"]
        assert n["start"] <= n["end"] and trace_to_ack >= -0.05
        db_hashes.add(g["attributes"]["databaseHash"])
        p, = [span for span in g["spans"] if span["name"] == AWAIT]
        assert g["start"] <= p["start"] <= p["end"] <= g["end"]
        assert not g["truncated"] and not n["truncated"]
        io = g["attributes"]["transactionIoStats"]
        assert (io["api"], io["io-context"]) == ("tx-with", "commit")
        sender, gw, await_ms = row["started"] - row["due"], g["end"] - g["start"], p["end"] - p["start"]
        readback = io["reads"]
        sql, evaluation = readback.get("sql-ms", 0), io["api-ms"]
        assert 0 <= sql <= evaluation and 0 < evaluation <= await_ms + 0.1
        # [DX-TAIL1] Why: another in-process trace timestamp bounds an uninterrupted writer suspension.
        # Rejected: assigning the rest of an unpartitioned peer wait to a JVM or to storage.
        endpoints = [p["start"], *marks[bisect_right(marks, p["start"]):bisect_left(marks, p["end"])], p["end"]]
        stages = dict(zip(KINDS, (sender, gw - await_ms, sql, evaluation - sql, await_ms - evaluation, row["ackMs"] - sender - gw)))
        assert math.isclose(sum(stages.values()), row["ackMs"], abs_tol=1e-6)
        before_submit = sum(max(0, min(end, n["start"]) - max(start, origin + row["due"])) for start, end in node_gc)
        result.append({"arm": number, "ordinal": row["ordinal"], "traceId": row["traceId"], "nativeT": row["t"],
                       "dueMs": row["due"], "ackMs": row["ackMs"], "gatewayMs": gw,
                       "outsideEvalMs": row["ackMs"] - evaluation, "peerAwaitMs": await_ms,
                       "nativeEvaluationMs": evaluation, **stages, "dominant": max(stages, key=stages.get),
                       "ownSqlReads": readback.get("sql", 0), "deserializeMs": readback.get("deserialize-ms", 0),
                       "awaitStart": p["start"], "awaitEnd": p["end"],
                       "gatewayMaxUnobservedGapMs": max(end - start for start, end in zip(endpoints, endpoints[1:])),
                       "nodeGcBeforeCallMs": before_submit, "nodeTraceEndToAckMs": trace_to_ack})
    assert len(db_hashes) == 1
    order = sorted(result, key=lambda item: int(item["nativeT"]))
    for i, item in enumerate(order):
        point = item["awaitStart"]
        overlapping = [other for other in order[:i] if other["awaitStart"] < point < other["awaitEnd"]]
        item["olderNativeWritesStillAwaiting"] = len(overlapping)
        # [DX-TAIL1] Why: SQL in a lower native T cannot have run before that write's own peer call.
        # Rejected: assigning exact predecessor SQL timestamps or assuming every outstanding reply is a native queue entry.
        latest = max(overlapping, key=lambda other: other["ownSqlMs"] - (point - other["awaitStart"]), default=None)
        overlap = min(latest["awaitEnd"], item["awaitEnd"]) - point if latest else 0
        lower = latest["ownSqlMs"] - (point - latest["awaitStart"]) if latest else 0
        item["earlierSqlOverlapLowerBoundMs"] = max(0, min(overlap, lower))
        item["earlierSqlNativeT"] = latest["nativeT"] if item["earlierSqlOverlapLowerBoundMs"] else None
    metrics = [{"offsetMs": row["at"] - origin, **row["metrics"]["GcPauseMsec"]}
               for row in tx if row.get("metrics", {}).get("GcPauseMsec")]
    read_requests = Counter(r.get("name") for r in reader if r.get("type") == "request")
    result_before = [row for row in result if row["dueMs"] < 2000]
    result_after = [row for row in result if row["dueMs"] >= 2000]
    references = {"identity": identity, "bootId": boot, "startAtMs": origin, "nodeOriginSpreadMs": max(fits) - min(fits),
                  "members": {name: pair[1] for name, pair in traces.items()}, "writerTraceCutSuffixes": partial,
                  "otherTraceCutSuffixes": reader_partial + tx_partial + node_partial,
                  "readGatewayRequests": dict(read_requests), "transactorRecordTypes": dict(Counter(r["type"] for r in tx)),
                  "transactorGcMetrics": metrics, "nodeGcMaxInWindowMs": max((b-a for a,b in node_gc if origin <= a < origin+45000), default=0),
                  "afterTwoSeconds": reading(result_after), "initialTwoSeconds": reading(result_before)}
    return result, references


def main(root, out):
    proof, request, terminal_at, comparison, read, traces, inventory = bundle(root)
    pools, summaries, tops = defaultdict(list), [], []
    for i, sample in enumerate(comparison["arms"], 1):
        rows, evidence = joined_arm(i, sample, read, traces[i], request, terminal_at)
        pools[sample["population"]].extend(rows)
        summaries.append(evidence)
    assert len({arm["identity"]["nonce"] for arm in summaries}) == 4
    assert len({(arm["tapeSha256"], arm["intentSha256"]) for arm in comparison["arms"]}) == 1
    cohorts = {}
    for name, pool in pools.items():
        for label, limit in (("all", 0), ("after-2s", 2000)):
            key = name + "/" + label
            winners = sorted((row for row in pool if row["dueMs"] >= limit),
                             key=lambda row: (-row["ackMs"], row["arm"], row["ordinal"]))[:50]
            assert len(winners) == 50
            cohorts[key] = reading(winners)
            tops.extend({"cohort": key, "rank": rank, **row} for rank, row in enumerate(winners, 1))
    out.mkdir()
    with (out / "TOP50.tsv").open("x", newline="") as f:
        csv_rows = csv.DictWriter(f, fieldnames=list(tops[0]), delimiter="\t")
        csv_rows.writeheader()
        csv_rows.writerows(tops)
    write_json(out / "observations.json", {"transferSha256": TRANSFER, "rawArchiveSha256": proof["raw"]["sha256"],
                                          "analysisSha256": sha(Path(__file__).read_bytes()), "source": proof["source"],
                                          "joined": sum(len(rows) for rows in pools.values()), "arms": summaries,
                                          "top50": cohorts, "rawInventory": inventory})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    main(arguments.bundle, arguments.output)
