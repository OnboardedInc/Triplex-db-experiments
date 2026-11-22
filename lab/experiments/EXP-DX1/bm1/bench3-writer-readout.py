"""Summarize verified PREP1 add-on evidence with the pinned builder's clock join."""

from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
from tempfile import TemporaryDirectory

ITEMS = {
    "rolling-rolling8": ("c8f903ce1142772751328b88d972cc527ca46dfc", ("rolling8",)),
    "cache32": ("97aced1b1128ca54da2a72003299f38d805f1abc", ("rolling6-cache32", "rolling6-tx5-cache32")),
    "cache32b": ("97aced1b1128ca54da2a72003299f38d805f1abc", ("rolling6-cache32", "rolling6-tx5-cache32")),
    "rolling6r": ("c8f903ce1142772751328b88d972cc527ca46dfc", ("rolling6",)),
    "cache32c": ("97aced1b1128ca54da2a72003299f38d805f1abc", ("rolling6-cache32", "rolling6-tx5-cache32")),
    "rolling6s": ("c8f903ce1142772751328b88d972cc527ca46dfc", ("rolling6",)),
    "tx5": ("73afad665ac2ccecea62161b8dfb6a3a48287057", ("rolling6-tx5",)),
    "fresh": ("891ab9139eb4fa6defe2c5484ada332b84090e6f", ("rolling6", "fresh6", "fresh-zgc6")),
}
BUILDER = "lab/experiments/EXP-DX1/prep1"
ANALYSER = "97aced1b1128ca54da2a72003299f38d805f1abc"


def read(path):
    return json.loads(path.read_bytes())


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def archive_files(evidence, kind, transfer, output):
    receipt = transfer[kind]
    assert receipt and receipt["name"] == f"{kind}.tar.zst"
    path = evidence / receipt["name"]
    assert path.stat().st_size == receipt["bytes"] and digest(path) == receipt["sha256"]
    listing = "members.json" if kind == "summary" else "raw-members.json"
    manifest_path = output / listing
    with subprocess.Popen(["zstd", "-qdc", str(path)], stdout=subprocess.PIPE) as process:
        with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
            names = set()
            for member in archive:
                name = Path(member.name)
                assert member.isfile() and not name.is_absolute() and ".." not in name.parts
                assert member.name not in names and not (output / name).exists()
                names.add(member.name)
                assert shutil.disk_usage(output).free > 5 * 1024**3 + member.size
                archive.extract(member, output, filter="data")
        while process.stdout.read(1024**2):
            pass
        assert process.wait() == 0
    assert digest(manifest_path) == transfer["summaryMembers" if kind == "summary" else "rawMembers"]
    manifest = read(manifest_path)
    assert names == {listing, *manifest}
    for name, meta in manifest.items():
        member = output / name
        assert member.stat().st_size == meta["bytes"] and digest(member) == meta["sha256"]


def spell_runs(points, floor):
    runs = []
    for i, _, pending in points:
        if pending < floor:
            continue
        if runs and i == runs[-1][-1][0] + 1:
            runs[-1].append((i, pending))
        else:
            runs.append([(i, pending)])
    return [dict(start=r[0][0], end=r[-1][0], max=max(p for _, p in r)) for r in runs if len(r) >= 5]


def late_index_bins(cell):
    jobs = cell["cacheByJob"]
    totals = {"inside": Counter(), "outside": Counter()}
    for second, row in cell["cacheBySecond"].items():
        if second < 150:
            continue
        if any(job["startSec"] <= second and second + 1 <= job["endSec"] for job in jobs):
            totals["inside"].update(row)
        elif all(second + 1 <= job["startSec"] or second >= job["endSec"] for job in jobs):
            totals["outside"].update(row)
    return {key: {"saves": row["saves"], **{
        metric: row[metric] / row["saves"] if row["saves"] else None
        for metric in ("sql", "applyMs", "aevt-load", "eavt-load")}}
        for key, row in totals.items()}


def inspect(evidence, item, output):
    source, labels = ITEMS[item]
    transfer = read(evidence / "TRANSFER.json")
    assert transfer["item"] == "bench3-" + item and transfer["producer"] == source
    assert list(transfer["serviceStates"]) == ["triplex-bench3-" + item + ".service"]
    assert next(iter(transfer["serviceStates"].values()))["ActiveState"] in ("inactive", "failed")
    archive_files(evidence, "summary", transfer, output)
    archive_files(evidence, "raw", transfer, output)
    producer = output if item == "rolling-rolling8" else output / "result"
    assert (producer / "source").read_text().strip() == source
    prefix = (producer / "prefix").read_text().strip()
    assert re.fullmatch("[a-f0-9]{8}", prefix)
    for name in ("read-rolling-checkpoints.py", "rolling_latency.py"):
        path = output / name.replace("-", "_")
        path.write_bytes(subprocess.check_output(["git", "show", f"{ANALYSER}:{BUILDER}/{name}"]))
    sys.path.insert(0, str(output))
    import read_rolling_checkpoints as builder
    from rolling_latency import backlog

    # [DX-BM1] Why: reuse PREP1's content and clock checks with the separately pinned add-on source.
    # Rejected: treating matching window names or evidence transfer alone as an accepted run.
    builder.SOURCE = source
    results = {}
    for label in labels:
        arm = f"1-{label}-S"
        now = producer / arm
        if not (now / "summary.json").is_file():
            results[label] = {"collected": False}
            continue
        checkpoint = output / "bench3" / "checkpoints" / label / "checkpoint.tar"
        checkpoint.parent.mkdir(parents=True)
        with tarfile.open(checkpoint, "w") as packed:
            for name in ("source", "plan.json", "seed.json", "SEAL.sha256", "prefix",
                         *(f"{arm}/{file}.json" for file in ("header", "complete", "summary"))):
                packed.add(producer / name, arcname=name)
        key = checkpoint.relative_to(output).as_posix()
        report = builder.checked_checkpoint(output, label, {key: digest(checkpoint)}, None)
        assert report["slot"] == f"tx2-dxprep1-{prefix}-{arm.lower()}"
        for basename in ("header", "complete", "summary"):
            assert (now / f"{basename}.json").is_file()
        assert (now / "summary.json").stat().st_mtime >= (now / "complete.json").stat().st_mtime >= (
            now / "header.json").stat().st_mtime
        raw = read(now / "summary.json")
        header = read(now / "header.json")
        if item != "fresh":
            report["index"] = builder.read_delays(producer, read(producer / "plan.json"), header, raw, True)
            for key, cell in report["index"].items():
                cell["lateIndexBins"] = late_index_bins(cell)
        for key, cell in report["cells"].items():
            if key.endswith("-loaded"):
                phase_path = now / f"{key}.json"
                assert digest(phase_path) == raw["rawSha256"][phase_path.name]
                phase = read(phase_path)
                all_points = backlog(phase["rows"], phase["seconds"])
                late = [point for point in all_points if point[0] >= 150]
                cell["pendingLate"] = {"maxUnacked": max(point[2] for point in late),
                                       "300": spell_runs(late, 300), "1000": spell_runs(late, 1000)}
        memory_path = now / "counters.ndjson"
        if item.startswith("cache32"):
            assert digest(memory_path) == raw["rawSha256"][memory_path.name]
            peaks = Counter()
            with memory_path.open() as file:
                for line in file:
                    row = json.loads(line)
                    for role, memory in row["memory"].items():
                        for metric in ("current", "anon", "file"):
                            key = f"{role}.{metric}"
                            peaks[key] = max(peaks[key], memory[metric])
            report["peakCgroupBytes"] = dict(peaks)
        results[label] = report
    return {"producer": source, "transferSha256": digest(evidence / "TRANSFER.json"), "arms": results}


if __name__ == "__main__":
    assert __debug__
    item, path = sys.argv[1:]
    with TemporaryDirectory(prefix="dx-bm1-readout-") as work:
        print(json.dumps(inspect(Path(path), item, Path(work)), indent=2))
