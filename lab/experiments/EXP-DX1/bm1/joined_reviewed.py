"""Collect the revised joined Publish run and retain its separate settlement endpoints."""

import json
import math
import os
import re
import subprocess
import time
import uuid
from pathlib import Path

from joined_preflight import EXP, digest, get

CELLS = [(mode, rate) for rate in (0, 3.5, 23.5) for mode in ("owed", "staged")]
JOIN = EXP / "actv-lazy/join"
POINTS = ("offer", "terminal", "window", "proof", "deadline", "point-inputs")


def collect(output, owner_file, source, subjects, issued_after, repo, node, *, env=None):
    # [DX-BM1] Why: replay the public producer's exact file format with its pinned oracle.
    # Rejected: adapting old 64-person digests into a new receipt, or accepting an archive seal as a result.
    output, owner_file, repo = map(Path, (output, owner_file, repo))
    owner = get(owner_file)
    assert owner["source"] == source and len(set(owner["roles"].values())) == 4
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == source
    inputs = get(output / "server-inputs.json")
    seal = get(output / "server-observations.json")
    producer = get(output / "server-collected.json")
    smoke = subjects == 64
    assert inputs["format"] == seal["format"] == "joined-components/2"
    assert (inputs["n"], inputs["smoke"], inputs["settlement"]) == (subjects, smoke, not smoke)
    assert inputs["planned"] == [list(cell) for cell in CELLS]
    assert issued_after <= inputs["issuedAt"] / 1000 <= time.time()
    assert str(uuid.UUID(inputs["nonce"])) == inputs["nonce"]
    assert inputs["slot"] == owner["container"] and inputs["volume"] == owner["volume"]
    assert inputs["source"] == source and inputs["owner"] == digest(owner_file)
    assert inputs["config"] == digest(repo / "lab/config/slots.json")
    for group in ("pins", "build"):
        for relative, checksum in inputs[group].items():
            file = (repo / relative).resolve()
            assert file.is_relative_to(repo.resolve()) and digest(file) == checksum
    names = {"server-effects", "server-effect-bytes", "server-seed"}
    names.update(f"{name}-{index}" for index in range(6) for name in POINTS)
    if not smoke:
        names.update("preflight/" + gate for gate in ("stage-gate", "idle-deadline", "future-gate", "joined-gate", "settle-gate"))
    assert set(seal["outputs"]) == names
    assert digest(output / "server-inputs.json") == seal["inputs"]
    run_env = dict(os.environ if env is None else env, TRIPLEX_LAB_SLOT_OWNER=str(owner_file))
    replay = subprocess.check_output(
        [str(node), "--experimental-strip-types", str(JOIN / "collect.ts"), str(output), str(subjects)],
        cwd=repo, env=run_env, text=True, timeout=480,
    )
    assert json.loads(replay) == producer
    windows = []
    releases = set()
    for i, (mode, rate) in enumerate(CELLS):
        offer, terminal, raw, proof, observed, point = [get(output / f"{name}-{i}.json") for name in POINTS]
        assert terminal["offerSha"] == digest(output / f"offer-{i}.json") and terminal["nativeTx"] == raw["nativeTx"]
        assert terminal["cut"] == observed["observed"]["basis"]["tx"] == raw["deadline"]["basis"]["tx"]
        assert point["nonce"] == offer["nonce"] == inputs["nonce"]
        assert raw["release"] not in releases and len(raw["coldDeadline"]["reads"]) == 3
        assert raw["coldDeadline"]["position"] == raw["coldDeadline"]["basis"]["tx"]
        assert all(row["basis"] == raw["coldDeadline"]["basis"] for row in raw["coldDeadline"]["reads"])
        releases.add(raw["release"])
        save_count = 0 if rate == 0 else math.ceil(rate * .5) if smoke else round(rate * 60)
        writes = raw["writes"]
        assert len(writes) == len({row["seq"] for row in writes}) == save_count
        assert all(
            a["p"] < b["p"] and a["offered"] < b["offered"]
            for a, b in zip(writes, writes[1:])
        )
        assert all(
            row["entered"] >= row["offered"] - 2 and row["done"] >= row["entered"]
            and row["tx"] and re.fullmatch("[a-f0-9]{64}", row["intent"]) for row in writes
        )
        offered, cutoff, durable = offer["offered"], offer["cutoff"], raw["durable"]
        miss = durable > cutoff or raw["first"]["finished"] > cutoff or any(
            sample["started"] > cutoff + 10 or sample["headObserved"] > cutoff + 50
            or sample["basis"]["tx"] < raw["nativeCut"]
            for sample in (raw["deadline"], raw["coldDeadline"])
        )
        assert raw["deadlineMiss"] is terminal["deadlineMiss"] is miss
        assert raw["offeredToDurableMs"] == raw["noticeRecipeDurableMs"] == durable - offered
        assert raw["firstCorrectMs"] == raw["first"]["finished"] - offered
        assert raw["changedValuesDurableMs"] == (durable - offered if mode == "staged" else None)
        assert raw["individualOwedDurableMs"] is None
        windows.append(dict(index=i, mode=mode, rate=rate, writes=save_count, deadlineMiss=miss,
                            durableMs=durable - offered, firstCorrectMs=raw["firstCorrectMs"],
                            durableClock=raw["durableClock"], proofChanges=proof["changes"],
                            owedEffects=proof["notices"], changedOwners=proof["changedOwners"]))
    return dict(source=source, owner=producer["owner"], nonce=inputs["nonce"], subjects=subjects,
                inputSha256=seal["inputs"], observationsSha256=digest(output / "server-observations.json"),
                producerSha256=digest(output / "server-collected.json"), windows=windows,
                effects=get(output / "server-effects.json")["effects"])


def settlement(output, subjects, seconds, readers, issued_after):
    output = Path(output)
    price = get(output / "settlement-price.json")
    assert [price["n"], price["seconds"], price["readerCount"]] == [subjects, seconds, readers]
    assert re.fullmatch(r"lazy-settlement-price-[a-f0-9-]{36}", price["scope"])
    assert re.fullmatch(r"lazy-settlement-quiet-[a-f0-9-]{36}", price["neighbour"])
    rows = []
    for index, rate in enumerate((3.5, 23.5)):
        path = output / f"settlement-{index}.json"
        assert path.stat().st_mtime >= issued_after
        sample, summary = get(path), price["result"][index]
        assert sample["receiverOffline"] is True and sample["rate"] == summary["rate"] == rate
        assert sample["cut"] == summary["cut"] and sample["tx"] and sample["proof"] == summary["proof"]
        assert sample["proof"]["count"] == subjects and sample["proof"]["changes"] > 0
        assert sample["terminal"]["values"]["state"]["status"] == "stored"
        clock = (sample["visible"] - sample["offer"], sample["terminal"]["values"]["ms"],
                 sample["terminal"]["notices"]["ms"])
        assert clock == (summary["markerMs"], summary["valuesMs"], summary["noticeMs"])
        measured = all(math.isfinite(value) and value > 0 for value in clock)
        assert measured and clock[0] <= min(clock[1:])
        ratios = []
        for j, dose in enumerate((rate, 3.5)):
            pair = {}
            for field, kind in (("save", "writes"), ("read", "reads")):
                by_phase = []
                for phase in ("control", "loaded"):
                    records = sample[phase][j][kind]
                    if field == "save":
                        assert len(records) == len({r["p"] for r in records}) == round(dose * seconds)
                    ms = sorted(r["ack"] - r["offered"] if field == "save" else r["elapsed"] for r in records)
                    assert ms and ms[0] >= 0
                    quantile = ms[math.ceil(.99 * len(ms)) - 1]
                    assert quantile == sample[phase][j][field + "P99"]
                    by_phase.append(quantile)
                pair[field] = by_phase[1] / by_phase[0]
            ratios.append(pair)
        assert ratios == sample["pairs"] == summary["p99Ratios"]
        rows.append(dict(rate=rate, markerMs=clock[0], valuesMs=clock[1], noticeMs=clock[2],
                         p99Ratios=ratios, sha256=digest(path)))
    return dict(subjects=subjects, seconds=seconds, readers=readers, priceSha256=digest(output / "settlement-price.json"),
                rows=rows)
