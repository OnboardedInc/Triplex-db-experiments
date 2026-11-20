"""Run the pinned one-database HA1 microframe campaign on the assigned bench."""

from datetime import datetime, timezone
import gzip
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from import_reading import micro_output
from overnight import import_inventory
from producer_readings import digest, get

ROOT = Path("/var/tmp/triplex-bm1/day-n20-ha1-micro")
REPO = ROOT/"build/repository"
BIN = ROOT/"build/tools/bin"
TAG = "bm1n20-microframes"
SOURCE = "14174308fa1b1f6ade7f3e1fe3ce58ca4bc173ba"
ENV = {**os.environ, "PATH": str(BIN)+":"+os.environ["PATH"],
       "DX_BARE_METAL": "1", "DOCKER_HOST": "unix:///var/run/docker.sock"}


def call(*args, timeout=45, **options):
    return subprocess.run(args, cwd=REPO, env=ENV, check=True, timeout=timeout, **options)


def output(*args):
    return call(*args, capture_output=True, text=True).stdout.strip()


def save(file, value):
    with file.open("x") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")


def status(state, following):
    temporary = ROOT/("status-"+uuid.uuid4().hex)
    temporary.write_text(f"item=ha1-micro state={state} since={datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ} next={following}\n")
    temporary.replace(ROOT.parent/"STATUS")


def cleanup():
    request_file = ROOT/"request.json"
    if not request_file.is_file():
        return
    request = get(request_file)
    assert request["root"] == str(ROOT) and request["tag"] == TAG and request["source"] == SOURCE
    receipt = ROOT/"cleanup.json"
    if receipt.is_file():
        assert get(receipt)["requestSha256"] == digest(request_file)
        return
    # [DX-BM1] Why: the producer normally closes the stack. A killed unit still has exact attempt labels.
    # Rejected: stopping other runs by a shared tag or dropping the partial offer tapes.
    found = import_inventory(request, mode_override="load-micro")
    for name in found["containers"]:
        with (ROOT/(name+"-aborted.log")).open("xb") as stream:
            try:
                call("docker","logs","--timestamps",name, stdout=stream, stderr=subprocess.STDOUT)
            except (subprocess.SubprocessError, OSError) as error:
                stream.write((str(error)+"\n").encode())
        call("docker","rm","-fv",name)
    for name in found["networks"]:
        call("docker","network","rm",name)
    for name in found["volumes"]:
        if output("docker","volume","ls","-q","--filter","name=^"+name+"$") == name:
            call("docker","volume","rm",name)
    remaining = import_inventory(request, mode_override="load-micro")
    assert remaining == {"containers": [], "networks": [], "volumes": []}
    save(receipt, {"requestSha256":digest(request_file), "inventory":remaining})


def run():
    assert not output("docker", "ps", "-q") and output("git","rev-parse","HEAD") == SOURCE
    assert output("git","diff","--name-only","HEAD") == ""
    local_gate = Path(__file__).resolve().parent/"SHA256SUMS"
    proof = "cd4c9abbe7137bc6f65fc101799dfb73fcdc6703bc6444ee168bdcdb08a9d0ff"
    assert f"{proof}  day-n20/ha1-micro-agreement/collector.json" in local_gate.read_text().splitlines()
    request = dict(root=str(ROOT), item=13, tag=TAG, source=SOURCE,
                   start=time.time(), smallEvidenceSha256=proof)
    save(ROOT/"request.json", request)
    status("measuring", "collector")
    try:
        call(BIN/"node", "lab/bin/heavy.mjs", "--label", "DX-BM1-ha1-micro", "--",
             BIN/"node", "--import", "tsx", "lab/experiments/EXP-DX1/ha1/bench.ts",
             "load-micro", TAG, SOURCE, "-", "-", "-", ROOT/"run", str(uuid.uuid4()), "50",
             "deep", "one-host", timeout=6600, stdin=subprocess.DEVNULL)
    finally:
        cleanup()
    campaign = get(ROOT/"run/campaign.json")
    assert [campaign[k] for k in ("tag", "sha", "mode", "sizes", "shape", "layout")] == [
        TAG, SOURCE, "load-micro", [50], "deep", "one-host"]
    directory, = (ROOT/"run").glob("load-micro-*")
    result = micro_output(directory,SOURCE,TAG,request["start"])
    # The published launcher serves reads and writes from the same gateway in this mode.
    events = [json.loads(line) for line in (directory/"events.jsonl").read_text().splitlines()]
    roles = {}
    for role, process, kind in (("writeGateway","gw-gc","write"), ("transactor","tx-gc","active")):
        file = process+".gz"
        log = directory/file
        member, = [e["data"] for e in events if e["type"] == "role" and e["data"]["role"] == kind]
        captured, = [e["data"] for e in events if e["type"] == "load-counter-bytes" and e["data"]["process"] == process]
        assert member["id"] == captured["id"] and captured["sha256"] == digest(log)
        with gzip.open(log, "rb") as stream:
            rows = stream.read().splitlines()
        clocked = [row for row in rows if re.match(rb"^\[\d{4}-\d\d-\d\dT",row)]
        assert clocked
        processors = {int(match[1]) for row in clocked if (match:=re.search(rb"CPUs: \d+ total, (\d+) available",row))}
        collectors = {match[1].decode().strip() for row in clocked if (match:=re.search(rb"\[gc\s*\] Using (.+)$",row))}
        assert processors == {2} and len(collectors) == 1
        roles[role] = {"file":file, "sha256":digest(log),
                       "jvmActiveProcessors":processors.pop(), "collector":collectors.pop(),
                       "container":member["id"], "configuredQuotaCores":3}
    save(ROOT/"collector.json", {**result, "jvms":roles, "readerGateway":None,
                                 "campaignSha256":digest(ROOT/"run/campaign.json")})
    status("measured", "next-ready-item")


if __name__ == "__main__":
    assert sys.argv[1:] in (["run"],["cleanup"])
    if sys.argv[1] == "run":
        run()
    else:
        cleanup()
        if not (ROOT/"collector.json").is_file():
            status("incomplete", "next-ready-item")
