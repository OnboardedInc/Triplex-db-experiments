"""Ship the new single-host runs without shipping a retained physical seed."""

from datetime import datetime, timezone
from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
SERVER = Path("/var/tmp/triplex-bm1")
MAC = Path.home()/"Claude/Projects/triplex-db-2/evidence"
SLOTS = {
    "bench3-fair-import": ("bench3/queue/fair-import", ("result", "unit.log", "prepared/inventory.json",
        "prepared/ready.txt", "build/BUILD-v0.1.json", "dry-run")),
    "bench3-removal": ("bench3/queue/removal", ("result", "unit.log", "started",
        "prepared/inventory.json", "prepared/ready.txt", "build/BUILD-v0.1.json")),
    "bench3-publish100k": ("bench3/queue/publish100k", ("result", "unit.log", "prepared/inventory.json",
        "prepared/ready.txt", "build/BUILD-v0.1.json", "dry-run")),
    "bench3-cold": ("bench3/queue/cold", ("result", "unit.log", "started", "cold.log", "build/BUILD-v0.1.json")),
    "bench3-rd1": ("bench3/queue/rd1", ("result", "unit.log", "started", "ladders.log", "affinity.log",
        "build/BUILD-v0.1.json")),
    "bench3-realistic": ("bench3/queue/realistic", ("result", "unit.log", "started", "verify.json",
        "verified-pins.sha256", "stopped/real1-copy.json", "build/BUILD-v0.1.json")),
    "bench3-realistic-card": ("bench3/queue/realistic-card", ("result", "unit.log", "started",
        "used-1.json", "used-2.json", "used-3.json", "cleanup-slots.txt", "build/BUILD-v0.1.json")),
    "bench3-control": ("bench3", ("tuned-control", "tuned-control-preflight", "control-preflight.log",
        "receive-start", "receive-end", "seed-verification.json",
        "control-producer.sha256", "control.log", "wal-mount.json", "host-profile.txt",
        "control-build/results/IMAGE-INPUTS.SHA256SUMS",
        "control-build/results/java25-image.json", "control-build/results/images.json", "control-build/results/lscpu.txt")),
    "publish-priority": ("day-n21/publish-priority", ("order", "small", "full", "launch-1", "launch-2",
        "launch-3", "owner.json",
        "topology.json", "control-hashes.txt", "control/publish-overlay.py", "control/publish-priority.ts",
        "control/publish-priority.sh", "seed-cutoff.txt", "worker.log", "pg.log", "tx.log", "gw-w.log",
        "gw-r.log", "remaining.txt", "build/bootstrap.log", "build/results/lscpu.txt",
        "build/results/IMAGE-INPUTS.SHA256SUMS", "build/results/bootstrap.exit")),
    "jvm25": ("night-n20-jvm25", ("small", "campaign", "restore-proofs", "adapter.json", "small-agreement.json", "collector.json")),
    "tail-backlog": ("night-n20-tail-backlog", ("small", "campaign", "restore-proofs", "adapter.json", "small-agreement.json", "collector.json")),
    "jvm25-retry": ("night-n20-jvm25-retry", ("small", "campaign", "restore-proofs", "adapter.json", "small-agreement.json", "collector.json")),
    "tail-backlog-integrated": ("night-n20-tail-backlog-integrated", ("small", "campaign", "restore-proofs", "adapter.json", "small-agreement.json", "collector.json")),
    "tail-backlog-generation": ("night-n20-tail-backlog-generation", ("small", "campaign", "restore-proofs", "adapter.json", "generation-wrapper.sha256", "small-agreement.json", "collector.json")),
    "erasure": ("night-n20-erasure", ("adapter.json", "measured", "guarded", "stage", "control-stage", "checkpoint.json", "collector.json",
                                        "stack.json", "erase-clean.json", "measurement-failures.json", "fast-transactor-gc.log", "fast-gateway-gc.log",
                                        "guarded-transactor-gc.log", "guarded-gateway-gc.log", "transactor.log", "postgres.log", "gateway.log")),
    "erasure-small": ("night-n20-erasure-small", ("measured", "guarded", "stage", "control-stage", "checkpoint.json", "collector.json", "erase-clean.json")),
    "erasure-retry": ("night-n20-erasure-retry", ("measured", "guarded", "stage", "control-stage", "checkpoint.json",
                                        "collector.json", "request.json", "stack.json", "erase-clean.json", "measurement-failures.json",
                                        "fast-transactor-gc.log", "fast-gateway-gc.log", "guarded-transactor-gc.log",
                                        "guarded-gateway-gc.log", "transactor.log", "postgres.log", "gateway.log")),
    "erasure-image": ("night-n20-erasure-image", ("measured", "guarded", "stage", "control-stage", "checkpoint.json",
                                        "collector.json", "request.json", "stack.json", "erase-clean.json", "measurement-failures.json",
                                        "fast-transactor-gc.log", "fast-gateway-gc.log", "guarded-transactor-gc.log",
                                        "guarded-gateway-gc.log", "transactor.log", "postgres.log", "gateway.log")),
    "erasure-recovery": ("night-n20-erasure-recovery", ("measured", "guarded", "stage", "control-stage", "checkpoint.json",
                                        "collector.json", "request.json", "stack.json", "erase-clean.json", "measurement-failures.json",
                                        "restore-witness.json", "before-recovery-sha256.json", "protected-edn-file-hashes.json",
                                        "stage-transactor-gc.log", "stage-gateway-gc.log", "fast-transactor-gc.log", "fast-gateway-gc.log",
                                        "guarded-transactor-gc.log", "guarded-gateway-gc.log", "transactor.log", "postgres.log", "gateway.log")),
    "ha1-pipeline": ("night-n20-ha1-pipeline", ("run", "collector.json", "cleanup.json", "worker.log")),
    "ha1-paced": ("night-n20-ha1-paced", ("run", "collector.json", "cleanup.json", "worker.log")),
    "prep1-followup": ("night-n20-prep-followup", ("small", "campaign", "adapter.json", "small-agreement.json", "collector.json")),
    "prep1-storage": ("night-n20-prep-storage", ("small", "campaign", "adapter.json", "small-agreement.json", "collector.json")),
    "prep1-ordered": ("night-n20-prep-ordered", ("small", "campaign", "adapter.json", "small-agreement.json", "collector.json")),
    "prep1-tail": ("night-n20-prep-tail", ("campaign", "filesystem.log", "bpf-version.txt",
                                        "bpf-smoke.log", "bpf-debs.sha256", "build/results/IMAGE-INPUTS.SHA256SUMS")),
    "prep1-tail-syscall": ("night-n20-prep1-tail-syscall", ("campaign", "filesystem.log", "bpf-version.txt",
                                          "bpf-smoke.log", "adapter.json", "build/results/IMAGE-INPUTS.SHA256SUMS")),
    "prep1-tail-remaining": ("night-n20-prep1-tail-remaining", ("campaign", "filesystem.log", "bpf-version.txt",
                                          "bpf-smoke.log", "adapter.json", "build/results/IMAGE-INPUTS.SHA256SUMS")),
    "prep1-tail-combined": ("night-n20-prep1-tail-combined", ("campaign", "filesystem.log", "bpf-version.txt",
                                          "bpf-smoke.log", "build/results/IMAGE-INPUTS.SHA256SUMS")),
    "jvm1": ("day-n20-jvm1", ("seed/seed.json", "seed/results", "small/results", "campaign/results",
                             "seed.log", "campaign.log", "retry.log", "retry-resumed.log", "failed-unit.txt",
                             "cold-postgres.json", "retry",
                             "build/results/lscpu.txt", "build/results/images.json",
                             "build/results/IMAGE-INPUTS.SHA256SUMS", "build/results/disks.txt")),
    "int1-capacity": ("day-n20-int1-capacity", ("small", "hot", "full", "comparison.json")),
    "int1-capacity-retry": ("day-n20-int1-capacity-retry", ("small", "hot", "full", "comparison.json")),
    "rd1-aged": ("day-n20-rd1-aged", ("small", "full", "worker.log")),
    "rd1-aged-retry": ("day-n20-rd1-aged-retry", ("small", "full", "worker.log")),
    "rd1-aged-native-trace": ("day-n20-rd1-aged-native-trace", ("small", "full", "worker.log")),
    "tail1": ("day-n20-tail1", ("serial", "g1", "g1-2core", "zgc", "campaign.log")),
    "ha1-micro": ("day-n20-ha1-micro", ("run", "collector.json", "worker.log", "cleanup.json")),
    "prep1": ("day-n20-prep1", ("adapter", "smoke", "campaign", "native-small-agreement.json", "worker.log")),
    "prep1-tenant": ("day-n20-prep1-tenant", ("adapter", "smoke", "campaign", "native-small-agreement.json", "worker.log",
                                            "finish-current-fence.txt", "two-gateway.log")),
}
ROLLING_ARMS = {
    "main": ("barrier6", "rolling6", "rolling12"),
    **{arm: (arm,) for arm in ("barrier6", "rolling6", "rolling8", "rolling12", "rolling16")},
}
for selection, arms in ROLLING_ARMS.items():
    SLOTS["bench3-rolling-"+selection] = (
        "bench3/rolling-"+selection,
        ("plan.json", "seed.json", "source", "prefix", "SEAL.sha256", "scale-wal-mount.json",
         "engines", *("1-"+arm+"-S" for arm in arms)),
    )
for selection in ("cache32", "cache32b", "cache32c", "tx5", "fresh", "rolling6r", "rolling6s"):
    SLOTS["bench3-"+selection] = ("bench3/queue/"+selection, ("result", "started", "unit.log",
        "build/results/IMAGE-INPUTS.SHA256SUMS", "build/results/images.json", "build/results/bootstrap.exit"))
# [DX-BM1] Why: bench 4 (2026-11-23) runs the aged 32 GiB cache arm with the same job layout as bench 3's add-ons.
SLOTS["bench4-owner-head"] = ("bench4/queue/owner-head", ("result", "unit.log", "first-offer-2", "pg-sampler.log",
    "build/BUILD-v0.1.json"))
for selection in ("startup-fresh", "startup-aged"):
    SLOTS["bench4-"+selection] = ("bench4/queue/"+selection, ("result", "unit.log", "dry-run", "pg-sampler.log"))
for selection in ("fair-yield", "fair-heap", "fair-memidx"):
    SLOTS["bench4-"+selection] = ("bench4/queue/"+selection, ("result", "unit.log", "prepared/inventory.json",
        "prepared/ready.txt", "build/BUILD-v0.1.json", "dry-run", "pg-sampler.log"))
for selection in ("cache32-aged", "cache32-aged-b", "cache32-aged-c", "cache32-aged-r", "cache32-aged-r2", "production", "production-r", "production-aged", "production-aged2", "production-s"):
    SLOTS["bench4-"+selection] = ("bench4/queue/"+selection, ("result", "started", "unit.log",
        "build/results/IMAGE-INPUTS.SHA256SUMS", "build/results/images.json", "build/results/bootstrap.exit"))


def load(filename):
    spec = spec_from_file_location(Path(filename).stem, HERE/filename)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def archive(name, revision):
    root, parts = SLOTS[name]
    root = SERVER/root
    units = ["bm1n20-"+name+".service"]
    if name == "jvm1":
        units = ["bm1n20-jvm1-seed.service", "bm1n20-jvm1-campaign.service"]
    if name == "erasure-small":
        units = ["bm1n20-erasure.service"]
    if name == "prep1-tenant" and (root/"finish-current-fence.txt").exists():
        units.append("bm1n20-prep1-two.service")
    if name == "prep1-storage":
        units = ["bm1n20-prep1-followup.service"]
    if name == "prep1-tail":
        units = ["bm1n20-prep-tail.service"]
    if name == "publish-priority":
        units = ["bm1n21-publish-build-final.service", "bm1n21-publish-priority.service",
                 "bm1n21-publish-retry.service", "bm1n21-publish-final.service",
                 "bm1n21-publish-roster.service"]
    if name == "bench3-control":
        units = ["triplex-bench3-bootstrap.service", "triplex-bench3-java25.service",
                 "triplex-bench3-seed-verify.service", "triplex-bench3-tuned-control.service",
                 "triplex-bench3-tuned-retry.service"]
    if name.startswith(("bench3-", "bench4-")) and name != "bench3-control":
        units = ["triplex-"+name+".service"]
    if name == "bench3-removal":
        # [DX-BM1] Why: the first removal unit was refused at stack start; the measured run is the repaired unit.
        units = ["triplex-bench3-removal2.service"]
    states = {}
    for unit in units:
        state = subprocess.check_output(["systemctl", "show", unit, "-p",
            "ActiveState,SubState,Result,InactiveEnterTimestampMonotonic"], text=True)
        states[unit] = dict(line.split("=", 1) for line in state.splitlines())
        assert states[unit]["ActiveState"] in ("inactive", "failed"), unit
    storage = root/"transfer"
    storage.mkdir(exist_ok=True)
    index = storage/"TRANSFER.json"
    if index.is_file():
        return index
    tool = load("night-archive.py")
    summaries, raw = [], []
    for selected in parts:
        part = root/selected
        for file in tool.walk(part):
            label = file.relative_to(root).as_posix()
            if file.name in {"oracle.sqlite", "measurement.sqlite"} or "pgdump" in file.name:
                continue
            if file.stat().st_size <= 32*1024**2 and (file.suffix in {".json",".txt",".md",".log"} or
                                                       ".log." in file.name or file.name.endswith(".log.gz")):
                summaries.append((label, file))
            else:
                raw.append((label, file))
    log = SERVER/((root.name.replace("prep1-tail", "prep-tail") if name=="prep1-tail-syscall" else root.name)+".log")
    if name.startswith("bench3-rolling-"):
        log = root.parent/(root.name+".log")
    if log.is_file():
        summaries.append(("unit.log", log))
    assert summaries, f"No result files in {root.name}"
    # [DX-BM1] Why: validate the exact transferred files and preserve original results after any packaging error.
    # Rejected: inferring measurement completion from an archive write or transferring a sealed population image.
    members = {label: {"sha256": tool.digest(file), "bytes": file.stat().st_size} for label,file in summaries}
    manifests = storage/"members.json"
    manifests.write_text(json.dumps(members, indent=2)+"\n")
    summary = tool.archive(storage/"summary.tar.zst", [*summaries, ("members.json", manifests)], True)
    assert summary, "Summary archive exceeded 1 GiB"
    raw_index = storage/"raw-members.json"
    raw_index.write_text(json.dumps({label: {"bytes": file.stat().st_size, "sha256": tool.digest(file)}
                                     for label,file in raw}, indent=2)+"\n")
    raw_archive = tool.archive(storage/"raw.tar.zst", [*raw, ("raw-members.json", raw_index)], True) if raw else None
    if raw_archive and raw_archive["bytes"] + summary["bytes"] >= tool.LIMIT:
        raw_archive = None
    body = {"item": name, "producer": revision, "serviceStates": states,
            "summary": summary, "summaryMembers": tool.digest(manifests),
            "raw": raw_archive, "rawMembers": tool.digest(raw_index), "rawFiles": len(raw),
            "rawDisposition": "transferred" if raw_archive else ("retained-on-bench" if raw else "empty")}
    pending = storage/".transfer-new.json"
    pending.write_text(json.dumps(body,indent=2)+"\n")
    pending.replace(index)
    return index


def check_compressed(file, member_name, manifest_hash):
    import hashlib
    metadata = {}
    expected = None
    # [DX-BM1] Why: verify every compressed member with bounded memory and no extracted tree on the Mac.
    # Rejected: accepting only the outer archive digest or applying no bound to local expansion.
    with subprocess.Popen(["zstd","-qdc",str(file)], stdout=subprocess.PIPE) as process:
        assert process.stdout is not None
        with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
            for item in archive:
                name = Path(item.name)
                assert item.isfile() and not name.is_absolute() and ".." not in name.parts
                assert item.name not in metadata
                with archive.extractfile(item) as stream:
                    if item.name == member_name:
                        assert expected is None and item.size < 64*1024**2
                        body = stream.read()
                        assert hashlib.sha256(body).hexdigest() == manifest_hash
                        expected = json.loads(body)
                    else:
                        digest = hashlib.sha256()
                        size = 0
                        while block := stream.read(1024*1024):
                            digest.update(block)
                            size += len(block)
                        assert size == item.size
                        metadata[item.name] = {"bytes":size,"sha256":digest.hexdigest()}
        while process.stdout.read(1024*1024):
            pass
        assert process.wait() == 0
    assert expected is not None and expected == metadata


def collect(name, revision, control, mode="trees"):
    assert mode in ("trees","--bundles")
    tool = load("night-client.py")
    report = shlex.quote(str(Path(control)/"lab/experiments/EXP-DX1/bm1/day-evidence.py"))
    worker = f"nice -n 15 ionice -c 3 /usr/bin/python3 {report} archive {shlex.quote(name)} {shlex.quote(revision)}"
    ticket_path = Path(tool.remote(worker, timeout=300).decode().strip())
    assert ticket_path == SERVER/SLOTS[name][0]/"transfer"/"TRANSFER.json"
    ticket_bytes = tool.remote("cat "+shlex.quote(str(ticket_path)))
    ticket = json.loads(ticket_bytes)
    assert ticket["item"] == name and ticket["producer"] == revision
    assert ticket["summary"]["bytes"] + (ticket["raw"] or {"bytes":0})["bytes"] < 1024**3
    day = name[:6] if name.startswith(("bench3-", "bench4-")) else ("day-n21" if name == "publish-priority" else "day-n20")
    out = MAC/"DX-BM1"/day/name
    out.mkdir(parents=True, exist_ok=True)
    arrival_bytes = ticket["summary"]["bytes"] + (ticket["raw"] or {"bytes":0})["bytes"]
    assert shutil.disk_usage(out).free > 5*1024**3 + arrival_bytes, "Under the Mac evidence reserve after transfer"
    for kind, name_key, member_key in (("summary","members.json","summaryMembers"),
                                       ("raw","raw-members.json","rawMembers")):
        block = ticket[kind]
        if not block:
            continue
        assert block["name"] == kind+".tar.zst"
        file = out/block["name"]
        tool.download(str(ticket_path.parent/block["name"]), file, block["sha256"])
        if mode == "--bundles":
            check_compressed(file, name_key, ticket[member_key])
            continue
        final = out/kind
        destination = final if final.is_dir() else Path(tempfile.mkdtemp(prefix=kind+"-",dir=out))
        names = {p.relative_to(destination).as_posix() for p in destination.rglob("*") if p.is_file()} if destination == final else tool.extract(file, destination)
        manifest = destination/name_key
        assert tool.hashfile(manifest) == ticket[member_key]
        members = json.loads(manifest.read_bytes())
        assert names == set(members)|{name_key}
        for path, expected in members.items():
            assert (destination/path).stat().st_size == expected["bytes"]
            assert tool.hashfile(destination/path) == expected["sha256"]
        if destination != final:
            destination.rename(final)
    transfer = out/"TRANSFER.json"
    transfer.write_bytes(ticket_bytes)
    index = MAC/"TRACE-INDEX.md"
    key = {"day-n20": f"bm1-friday-{name}", "bench4": f"bm1-monday-{name}"}.get(day, f"bm1-saturday-{name}")
    if f"| {key} |" not in index.read_text():
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with index.open("a") as stream:
            stream.write(f"| {stamp} | {key} | {revision} | null | Bench evidence transfer. {ticket['rawDisposition']}. | "
                         f"[TRANSFER.json]({transfer}) | {out} |\n")
    print(transfer)


if __name__ == "__main__":
    action, item, source, *arguments = sys.argv[1:]
    assert item in SLOTS and len(source) == 40 and all(c in "0123456789abcdef" for c in source)
    if action == "archive":
        print(archive(item, source))
    else:
        assert action == "collect"
        collect(item, source, *arguments)
