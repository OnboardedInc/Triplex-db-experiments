"""Check the stock gateway and ERASE1 correctness artifacts for the integration candidate."""

import hashlib
import json
from pathlib import Path
import sys

from read_probe import frozen_inputs, read, sha

ERASURE_ROUTES = {
    "open-handle", "fresh-history", "replica-current", "replica-retained",
    "journal", "feed-resume", "import-replay", "publish-barrier",
    "notice-sender", "notice-recipient", "joined-marker-staging", "ssn-rule", "backup-restore",
}


def encoded_hash(data):
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def native(out):
    inputs, image = frozen_inputs(out)
    terminal = read(out / "terminal.json")
    assert inputs["mode"] == "subject-native-suite"
    assert inputs["timings"] == terminal["timings"] == "diagnostic"
    assert terminal["holder"] == "DX-PREP1" and terminal["slot"] == "tx2-datomic-selftest"
    assert terminal["attempt"] == inputs["attempt"] and terminal["exit"] == 0
    assert terminal["image"] == image["imageId"]
    log = out / terminal["log"]
    assert sha(log) == terminal["sha256"]
    lines = log.read_text().splitlines()
    proof, = [json.loads(line.removeprefix("PREP1_SUITE ")) for line in lines if line.startswith("PREP1_SUITE ")]
    assert proof == {"attempt": inputs["attempt"], "subject": inputs["subject"]}
    summary, = [json.loads(line) for line in lines if line.startswith('{"test":')]
    assert summary["test"] == 27 and summary["pass"] >= 54079 and summary["fail"] == summary["error"] == 0
    return {"head": inputs["head"], "subject": inputs["subject"], "nativeTests": summary, **terminal}


def erasure(out, subject):
    inputs = read(out / "inputs.json")
    run = read(out / "native.json")
    cleanup = read(out / "cleanup.json")
    assert run["binding"] == encoded_hash({k: v for k, v in run.items() if k != "binding"})
    assert run["sourceHash"] == encoded_hash(inputs["inputs"])
    assert run["nonce"] == inputs["nonce"] == cleanup["nonce"]
    assert run["mode"] == inputs["mode"] == "ledger-regression"
    assert run["host"] == "mac-vm" and run.get("timing", run.get("timings")) == "diagnostic"
    assert run["people"] == inputs["people"]
    assert run["slot"] == cleanup["slot"] and cleanup["released"] and not cleanup["errors"]
    restore = read(out / "exit-restore.json")
    assert restore["code"] == 0 and not restore["running"] and not restore["oom"]
    # [DX-PREP1] Why: the backup gate starts an owned restore helper after the initial stack receipt.
    # Rejected: ignoring extra cleanup entries or claiming the three initially recorded processes were the whole run.
    assert set(cleanup["removedContainers"]) == {*run["containers"].values(), restore["id"]}
    assert read(out / "driver-exit.json") == {"code": 0, "signal": None}

    def data(name):
        observed = read(out / (name + ".json"))
        body = observed.pop("data")
        assert observed == run
        return body

    # [DX-PREP1] Why: require each named boundary and its companion file from the same owned attempt.
    # Rejected: trusting exit zero or the aggregate checks without reopening the route witnesses.
    options = data("subject-writer-options")
    assert bool(options.get("subjectSave")) == subject and options["gatewaySourceHash"] == run["gateway"]
    assert options["database"].startswith("s2-") and options["commitFunctionInstalled"]
    evidence = data("regression-cases")["evidence"]
    assert len(evidence) == len(ERASURE_ROUTES) and {entry["route"] for entry in evidence} == ERASURE_ROUTES
    ids = set()
    for entry in evidence:
        route = data("regression-" + entry["route"])
        assert route.pop("cut") > 0
        ids.add(route.pop("id"))
        assert route == entry and entry["check"] is True
    assert len(ids) == 1 and bool(next(iter(ids)))
    return {"head": inputs["inputs"]["head"], "subject": subject, "routes": len(evidence),
            "nonce": run["nonce"], "slot": run["slot"], "binding": run["binding"]}


if __name__ == "__main__":
    kind, directory, output, *setting = sys.argv[1:]
    assert __debug__
    assert kind in ("native", "erasure")
    assert setting in ([], ["0"], ["1"])
    assert (kind == "erasure") == bool(setting)
    result = native(Path(directory)) if kind == "native" else erasure(Path(directory), setting[0] == "1")
    with Path(output).open("x") as file:
        json.dump(result, file, indent=2)
        file.write("\n")
