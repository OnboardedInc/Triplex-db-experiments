"""Verify transferred rolling checkpoints and identify which source data they contain."""

import argparse
import hashlib
import json
import math
from pathlib import Path
import tarfile
from rolling_latency import PhaseLatency, overlaps, safepoints


SOURCE = "c8f903ce1142772751328b88d972cc527ca46dfc"
IMAGE = "77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked_checkpoint(root, label, manifest, raw_root=None):
    base = f"bench3/checkpoints/{label}/checkpoint.tar"
    path = root / base
    if not path.is_file() or base not in manifest:
        return None
    with path.open("rb") as f:
        archive_sha = hashlib.file_digest(f, "sha256").hexdigest()
    assert archive_sha == manifest[base]
    arm = f"1-{label}-S"
    with tarfile.open(path) as archive:
        names = {m.name for m in archive if m.isfile()}
        assert {"source", "plan.json", "seed.json", "SEAL.sha256",
                *(f"{arm}/{f}.json" for f in ("complete", "header", "summary"))} <= names

        def raw(name):
            with archive.extractfile(name) as content:
                return content.read()

        def j(name):
            return json.loads(raw(name))

        expected = dict((name, sha) for sha, name in (line.split() for line in raw("SEAL.sha256").decode().splitlines()))
        assert {name: digest(raw(name)) for name in ("plan.json", "seed.json")} == expected
        assert raw("source").decode().strip() == SOURCE
        plan, seed = j("plan.json"), j("seed.json")
        assert (seed["head"], seed["facts"], seed["imageSha256"], plan["seconds"]) == (87002, 162456470, IMAGE, 300)
        header, complete, summary = (j(f"{arm}/{f}.json") for f in ("header", "complete", "summary"))
        assert not summary["fixture"]
        assert summary["source"] == header["commit"] == complete["commit"] == SOURCE
        assert header["slot"] == complete["slot"] == summary["slot"]
        assert header["nonce"] == complete["nonce"] == summary["nonce"]
        assert (header["head"], header["seedSha"], summary["seedSha"], summary["planSha"]) == (
            87002, expected["seed.json"], expected["seed.json"], expected["plan.json"])
        for file in ("header.json", "complete.json"):
            assert digest(raw(f"{arm}/{file}")) == summary["rawSha256"][file]
        expected_arm, = [a for a in plan["arms"] if a["id"] == arm]
        assert header["arm"] == {k: v for k, v in expected_arm.items() if k != "cells"}
        assert summary["fairCredits"] == header["fairCredits"] == expected_arm["admission"]["credits"]
        cells = {c["cell"]: c for c in summary["cells"]}
        assert complete["cut"] == seed["head"] + sum(c["durable"] for c in cells.values())
        assert list(cells) == [c["label"] for c in expected_arm["cells"]]
        out = {}
        for exp in expected_arm["cells"]:
            key, rate = exp["label"], exp["rate"]
            c = cells[key]
            assert c["offered"] == exp["offered"] == (rate * 300 if key.endswith("-loaded") else 1050)
            left, right = c["firstHalf"], c["secondHalf"]
            assert (c["offered"], c["durable"]) == (left["offers"] + right["offers"], left["acks"] + right["acks"])
            assert c["whole"]["offers"] == c["offered"] and c["whole"]["acks"] == c["durable"]
            first_acks, second_acks = round(left["rate"] * 150), round(right["rate"] * 150)
            assert c["inWindow"] == first_acks + second_acks
            quiet = [p for p in plan["tapes"][key] if p[1] == 0]
            assert len(quiet) == 1050
            if key.endswith("-loaded"):
                assert quiet == plan["tapes"][key.replace("-loaded", "-alone")]
            out[key] = {k: c[k] for k in ("whole", "firstHalf", "secondHalf", "stageP99Ms", "appendP99Ms",
                        "creditHoldP99Ms", "barrierHoldP99Ms", "rollingCpu", "nativeIoPerSave",
                        "savesPerAppend", "readsByPredecessor")}
            out[key]["notYetAcked"] = [left["offers"] - first_acks, c["offered"] - c["inWindow"]]
            # [DX-PREP1] Why: bound overlap without pretending separately ranked saves are the same rows.
            # Rejected: adding p99s or subtracting them as a stage decomposition.
            http_p99 = c["stageP99Ms"]["httpRoundTrip"]
            possible_long_http = c["durable"] - math.ceil(c["durable"] * .99)
            floors = {}
            for side, half in (("firstHalf", left), ("secondHalf", right)):
                at_least = half["acks"] - math.ceil(half["acks"] * .5) + 1 - possible_long_http
                extra = half["ackedP50Ms"] - 50
                if at_least > 0 and extra > http_p99:
                    floors[side] = dict(savesAtLeast=at_least,
                                        extraBeforeSendSec=at_least * (extra-http_p99) / 1000,
                                        shareWithinSubcohort=(extra-http_p99) / extra)
            out[key]["preSendFloor"] = floors
        ledger = read_delays(raw_root, plan, header, summary) if raw_root else None
        return dict(archiveSha256=archive_sha, source=SOURCE, slot=summary["slot"], nonce=summary["nonce"],
                    members=sorted(names), rawPresent=sorted(n for n in names if Path(n).name in {
                        "r394-loaded.json", "prep1-native.ndjson", "counters.ndjson", "prep1-gc-gw-w.log"}),
                    cells=out, rawDelayLedger=ledger)


def resource_windows(phase, analysis, samples, index, credits, ticks):
    start = int(phase["phaseStartNs"])
    depth = 0
    cap_spans = []
    endpoints = []
    for row in phase["rows"]:
        if credits and row["account"] != 0 and row.get("ack") and "creditReleased" in row:
            endpoints.extend(((row["creditGranted"], 1), (row["creditReleased"], -1)))
    for when, delta in sorted(endpoints):
        if depth == credits-1 and delta == -1:
            cap_spans.append((cap_start, when))
        depth += delta
        assert 0 <= depth <= credits-1
        if depth == credits-1 and delta == 1:
            cap_start = when
    assert depth == 0
    apply_spans = []
    for lo, hi, _ in sorted(analysis.applies):
        if apply_spans and lo <= apply_spans[-1][1]:
            apply_spans[-1] = (apply_spans[-1][0], max(hi, apply_spans[-1][1]))
        else:
            apply_spans.append((lo, hi))
    second = phase["seconds"] // 2
    windows = [(0, second), (second, phase["seconds"])]
    if phase["label"] == "r394-loaded":
        windows.extend((i, i+10) for i in range(0, phase["seconds"], 10))
    out = []
    for lo, hi in windows:
        before, after = (min(samples, key=lambda s: abs(int(s["monoNs"])-start-i*1_000_000_000)) for i in (lo, hi))
        seconds = (int(after["monoNs"])-int(before["monoNs"]))/1e9
        assert seconds > 0
        pins = {role: (end["usage_usec"]-before["cpu"][role]["usage_usec"])/(1e6*seconds)
                for role, end in after["cpu"].items()}
        pins["sender"] = (after["senderTicks"]-before["senderTicks"])/(ticks*seconds)
        out.append(dict(fromSec=lo, toSec=hi,
                        nativeApplyBusy=overlaps(apply_spans, lo*1000, hi*1000)/((hi-lo)*1000),
                        neighbourCreditsFull=(overlaps(cap_spans, lo*1000, hi*1000)/((hi-lo)*1000)
                                              if endpoints else None),
                        cores=pins,
                        checkpointCount={k: after["pg"]["checkpointer"][k]-before["pg"]["checkpointer"][k]
                                         for k in ("num_timed", "num_requested")},
                        walMs={k: after["pg"]["wal"][k]-before["pg"]["wal"][k]
                               for k in ("wal_write_time", "wal_sync_time")},
                        indexAdoptions=[round((x["start"]-start/1e6)/1000, 2)
                                        for x in index if x["type"] == "index-adoption"
                                        and lo <= (x["start"]-start/1e6)/1000 < hi]))
    return out


def read_delays(root, plan, header, summary):
    arm = header["arm"]["id"]
    slot = header["slot"]

    # [DX-PREP1] Why: both the raw file hash and its owned role path must match the transferred checkpoint.
    # Rejected: joining another arm's repeated cell name or native transaction number.
    def witnessed(directory, name):
        candidates = list(root.glob(f"**/{directory}/{name}"))
        assert len(candidates) == 1, (directory, name)
        with candidates[0].open("rb") as f:
            assert hashlib.file_digest(f, "sha256").hexdigest() == summary["rawSha256"][name]
        return candidates[0]

    role_path = f"{slot}/trace/raw"
    identity = json.loads(witnessed(arm, "counters-ready.json").read_bytes())
    assert (identity["source"], identity["slot"], identity["attempt"]) == (SOURCE, slot, header["nonce"])
    with witnessed(arm, "counters.ndjson").open() as data:
        counters = [json.loads(line) for line in data]
    with witnessed(role_path, "prep1-index.ndjson").open() as data:
        index = [json.loads(line) for line in data]
    assert index[-1] == {"attempt": header["nonce"], "type": "end", "dropped": 0}
    assert all(row["attempt"] == header["nonce"] for row in index)
    pauses = {}
    for role in ("tx", "gw-w", "gw-r"):
        with witnessed(role_path, f"prep1-gc-{role}.log").open() as data:
            pauses[role] = safepoints(data)
    rows_by_t, ended = {}, False
    with witnessed(role_path, "prep1-native.ndjson").open() as data:
        for line in data:
            block = json.loads(line)
            assert not ended and block["attempt"] == header["nonce"]
            if block.get("end") is True:
                assert block["dropped"] == 0
                ended = True
                continue
            if block["db"] != header["db"]:
                continue
            for m in block["members"]:
                t = str(m["t"])
                assert t not in rows_by_t
                assert m["read-at"] <= m["started-at"] <= m["applied-at"] <= block["start"] <= block["end"]
                rows_by_t[t] = block, m
    assert ended
    out = {}
    for c in summary["cells"]:
        cell = c["cell"]
        phase = json.loads(witnessed(arm, f"{cell}.json").read_bytes())
        assert phase["label"] == cell and phase["seconds"] == 300
        tape = plan["tapes"][cell]
        analysis = PhaseLatency(phase, pauses)
        checked = 0
        for row, offer in zip(sorted(phase["rows"], key=lambda r: r["ordinal"]), tape, strict=True):
            assert (row["due"], row["account"], row["person"]) == tuple(offer[:3])
            if row.get("ack"):
                ack, receipt = row["ack"], row["receipt"]
                assert (ack["operationId"], int(ack["position"]["v"]), ack["t"]["v"], ack["recordedAt"]["v"]) == (
                    row["id"], receipt["p"], receipt["t"], receipt["clock"])
                block, member = rows_by_t.pop(receipt["t"])
                assert int(phase["phaseStartNs"]) <= member["started-at"]
                assert block["end"] <= int(phase["phaseStartNs"]) + round(row["end"] * 1e6) + 100000
                checked += 1
                analysis.add(row, block, member)
        assert checked == c["durable"]
        out[cell] = analysis.finished()
        if cell.endswith("-loaded"):
            out[cell]["resourceWindows"] = resource_windows(
                phase, analysis, counters, index, summary["fairCredits"] if "rolling" in arm else 0, identity["ticks"])
    return out


if __name__ == "__main__":
    assert __debug__
    cli = argparse.ArgumentParser()
    cli.add_argument("evidence", type=Path)
    cli.add_argument("manifest", type=Path)
    cli.add_argument("--raw", type=Path, help="Verified unpacked arm tree containing the raw cells and role logs")
    args = cli.parse_args()
    manifest = dict((name, sha) for sha, name in (line.split() for line in args.manifest.read_text().splitlines() if line.strip()))
    results = {name: checked_checkpoint(args.evidence, name, manifest, args.raw) for name in ("barrier6", "rolling6", "rolling12")}
    print(json.dumps(results, indent=2))
