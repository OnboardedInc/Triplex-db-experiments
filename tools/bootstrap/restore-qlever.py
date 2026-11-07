#!/usr/bin/env python3
"""Restore the stopped owned QLever after its retained read OOM; never reset data."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DOCKER = [str(ROOT / "tools/bootstrap/with-env.sh"), "docker"]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value, exclusive=False):
    with path.open("x" if exclusive else "w") as output:
        json.dump(value, output, indent=2)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--observe-existing", action="store_true", help="Fresh audit of the same already-restored instance; starts nothing")
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if not output.is_relative_to(ROOT) or not output.parent.is_dir():
        raise ValueError("Recovery receipt must be in the owned attempt artifacts")
    subprocess.run(["python3", str(ROOT / "tools/bootstrap/check-storage.py")], check=True, stdout=subprocess.DEVNULL)
    owner = json.loads((ROOT / ".runtime/engines/owners.json").read_text())["engines"]["qlever"]
    directory = Path(owner["directory"])
    previous = json.loads((directory / "datalog142-first-oom.json").read_text())
    packet = json.loads((ROOT / ".devloop/jobs/qlever-datalog-packet-bounded-v2/attempts/0001/artifacts/report.json").read_text())
    state = json.loads((ROOT / ".devloop/state.json").read_text())
    if state["owners"]["foundation-qlever"]["status"] != "unknown":
        raise ValueError("Retain UNKNOWN foundation reservation throughout explicit recovery")
    daemon = json.loads(subprocess.check_output([*DOCKER, "info", "--format", "{{json .}}"], text=True))
    if daemon["ID"] != "83f54592-d273-4f4e-9f03-4b0b7c1dd105":
        raise ValueError("Wrong private Docker daemon")
    # Raw inspect contains the access token: inspect in memory and retain only
    # the explicit safe identity/cap/state projection below.
    before = json.loads(subprocess.check_output([*DOCKER, "inspect", owner["id"]], text=True))[0]
    if before["Id"] != owner["id"] or before["Image"] != owner["image"] or before["State"]["Running"] != args.observe_existing:
        raise ValueError("Recovery requires the exact owned container in its declared stopped/running phase")
    if before["Config"]["Labels"].get("triplex.owner") != "triplex-db-portable-13e39903":
        raise ValueError("Wrong container owner")
    if before["HostConfig"]["Memory"] != 2 * 1024**3 or before["HostConfig"]["MemorySwap"] != 2 * 1024**3 or before["HostConfig"]["NanoCpus"] != 1500000000:
        raise ValueError("Recovery must retain the original2GiB/1.5CPU caps")
    if not any(m["Type"] == "bind" and m["Source"] == str(directory / "data") and m["Destination"] == "/data" for m in before["Mounts"]):
        raise ValueError("Wrong owned data mount")
    for item in previous["retainedDataFiles"]:
        if args.observe_existing and item["path"].endswith((".metrics-log.jsonl", ".resource-usage-log.tsv")):
            continue  # Operational logs append during restored service; data is never exempted.
        path = directory / item["path"]
        if path.is_symlink() or sha(path) != item["sha256"]:
            raise ValueError("Stopped forensic state changed before recovery: " + item["path"])
    delta = directory / "data/triplex.update-triples"
    delta_before = sha(delta)
    token = (directory / "access-token").read_text().strip()
    report = {"format": "triplex-owned-qlever-recovery/1", "status": "RUNNING", "phase": "observe-existing" if args.observe_existing else "start-and-observe", "grant": "recover-001", "containerId": owner["id"], "imageSha256": owner["image"], "before": before["State"], "originalOomState": previous["state"], "unchangedCaps": {"memoryBytes": 2 * 1024**3, "cpuUnits": 1.5}, "deltaBeforeSha256": delta_before, "checks": [], "limitations": ["Recovery follows a read-triggered OOM, not a write-crash or power-loss test.", "ACKed positions, claims and retained-domain history counts cover the new packet's12 ingested workloads. Full value/interval history equivalence is additionally checked for direct-state workloads01/02.", "The foundation remains UNKNOWN until independently refreshed from this readiness receipt."]}
    save(output, report, True)

    def get(parameters):
        request = urllib.request.Request(owner["url"] + "/?" + urllib.parse.urlencode(parameters), headers={"Authorization": "Bearer " + token})
        with urllib.request.urlopen(request, timeout=5) as response:
            data = response.read(2 * 1024**2 + 1)
            if len(data) > 2 * 1024**2:
                raise ValueError("Readiness byte budget exceeded")
            return json.loads(data)

    def query(text):
        request = urllib.request.Request(owner["url"], data=text.encode(), headers={"Authorization": "Bearer " + token, "Content-Type": "application/sparql-query", "Accept": "application/sparql-results+json"})
        started = time.monotonic()
        with urllib.request.urlopen(request, timeout=10) as response:
            data = response.read(2 * 1024**2 + 1)
            if len(data) > 2 * 1024**2:
                raise ValueError("Recovery query byte budget exceeded")
            rows = json.loads(data)["results"]["bindings"]
        report["checks"].append({"query": text, "elapsedSeconds": time.monotonic() - started, "rows": rows})
        save(output, report)
        return rows

    field = lambda name: "<urn:triplex:field:" + name + ">"
    graph = lambda scope: "<urn:triplex:scope:" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=") + ">"
    literal = lambda value: json.dumps(value, ensure_ascii=False)
    try:
        if not args.observe_existing:
            subprocess.run([*DOCKER, "start", owner["id"]], check=True, stdout=subprocess.DEVNULL)
        deadline = time.monotonic() + 60
        while True:
            try:
                if not args.observe_existing:
                    get({"query-planning-budget": "100"})
                settings = get({"cmd": "get-settings"})
                stats = get({"cmd": "stats"})
                if settings["query-planning-budget"] != "100" or not stats["git-hash-server"].startswith("6c5861a"):
                    raise ValueError("Pinned profile readback differs")
                break
            except Exception:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(.2)
        selected = [w for w in packet["workloads"] if w.get("groups")]
        if len(selected) != 12:
            raise ValueError("Expected exactly12 ACKed workload scopes from the failed packet")
        for workload in selected:
            g = graph(workload["scope"])
            position = query(f"SELECT ?position WHERE {{ GRAPH {g} {{ <urn:triplex:meta> {field('position')} ?position }} }}")
            assert int(position[0]["position"]["value"]) == workload["groups"][-1]["actualPosition"]
            claims = query(f"SELECT ?command ?position ?transaction WHERE {{ GRAPH {g} {{ ?claim {field('command_id')} ?command ; {field('position')} ?position ; {field('tx_id')} ?transaction }} }}")
            actual = {row["command"]["value"]: int(row["position"]["value"]) for row in claims}
            expected = {item["commandId"]: item["actualPosition"] for item in workload["groups"]}
            assert len(actual) == len(claims) and actual == expected
            for retracted in [False, True]:
                count = query(f"SELECT (COUNT(DISTINCT ?assertion) AS ?count) WHERE {{ GRAPH {g} {{ ?assertion {field('attribute')} ?attribute . {f'?assertion {field("retracted_position")} ?retired .' if retracted else ''} FILTER(STRSTARTS(?attribute,{literal(':w' + workload['id'] + '/')})) }} }}")
                assert int(count[0]["count"]["value"]) == sum(group["retractions" if retracted else "assertions"] for group in workload["groups"])
        source = json.loads((ROOT / "qualification/workloads/temporal-workloads.json").read_text())
        for id in ["01", "02"]:
            workload = next(w for w in selected if w["id"] == id)
            original = next(w for w in source["workloads"] if w["id"] == id)
            positions = {group["logical"]: group["actualPosition"] for group in workload["groups"]}
            values = []
            for attribute in sorted({a["attribute"] for a in original["assertions"]}):
                key = ":w" + id + "/a" + attribute.encode().hex()
                rows = query(f"SELECT ?entity ?value ?from ?to ?recorded ?retired WHERE {{ GRAPH {graph(workload['scope'])} {{ ?s {field('attribute')} {literal(key)} ; {field('entity_id')} ?entity ; {field('value_string')} ?value ; {field('valid_from')} ?from ; {field('recorded_position')} ?recorded . OPTIONAL {{ ?s {field('valid_to')} ?to }} OPTIONAL {{ ?s {field('retracted_position')} ?retired }} }} }}")
                for row in rows:
                    values.append([row["entity"]["value"], attribute, row["value"]["value"], int(row["from"]["value"]), int(row["to"]["value"]) if "to" in row else None, int(row["recorded"]["value"]), int(row["retired"]["value"]) if "retired" in row else None])
            expected = [[a["entity"], a["attribute"], a["value"]["value"], int(a["valid"][0]) + 1000000, int(a["valid"][1]) + 1000000 if a["valid"][1] is not None else None, positions[int(a["known"][0])], positions[int(a["known"][1])] if a["known"][1] is not None else None] for a in original["assertions"]]
            assert sorted(map(json.dumps, values)) == sorted(map(json.dumps, expected)), id
        after = json.loads(subprocess.check_output([*DOCKER, "inspect", "--format", "{{json .State}}", owner["id"]], text=True))
        assert after["Running"] and after["StartedAt"] > previous["state"]["StartedAt"]
        assert (after["StartedAt"] == before["State"]["StartedAt"]) == args.observe_existing
        assert sha(delta) == delta_before
        report.update(status="PASS_READ_OOM_RECOVERY_ONLY", after=after, settings=settings, stats=stats, recoveredAcknowledgedWorkloads=len(selected), deltaAfterSha256=sha(delta))
        save(output, report)
        save(output.parent / "recovery-status.json", {"restored": True, "acknowledgedWorkloads": 12, "positionHistoryClaimsPassed": True}, True)
        print(json.dumps({"output": str(output), "status": report["status"], "queries": len(report["checks"])}))
    except Exception as error:
        report.update(status="FAIL_RETAINED_UNKNOWN_OWNER", error=type(error).__name__ + ": " + str(error))
        save(output, report)
        raise


if __name__ == "__main__":
    main()
