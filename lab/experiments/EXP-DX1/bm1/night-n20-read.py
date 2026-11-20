"""Check native phase and recording files against the pinned producer tape."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from importlib.util import module_from_spec, spec_from_file_location

module = spec_from_file_location("source", Path(__file__).with_name("night-n20-source.py"))
source = module_from_spec(module)
module.loader.exec_module(source)


def read(file):
    return json.loads(file.read_bytes())


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inputs(repo, item, small):
    script = '''
import { createHash } from 'node:crypto';
import { fieldPlan } from './lab/experiments/EXP-DX1/w1/field/bench-check.ts';
const [item, mode] = process.argv.slice(1);
const plans = fieldPlan();
let chosen = item === 'tail-backlog' ? plans.filter((p) => p.label === 'solo394') : plans;
if (mode === 'small') chosen = chosen.slice(0, 1).map((p) => ({ ...p, schedule: p.schedule.slice(0,8) }));
console.log(JSON.stringify(chosen.map((p) => ({...p, sha: createHash('sha256').update(JSON.stringify(p.schedule)).digest('hex')}))));
'''
    return json.loads(subprocess.check_output(["node", "--import", "tsx", "--input-type=module", "-e", script,
                                                item, "small" if small else "full"], cwd=repo))


def native_phase(phase, plan, base):
    n = len(plan["schedule"])
    assert phase["label"] == plan["label"] and phase["scheduleSha256"] == plan["sha"]
    assert phase["headBefore"] == base and phase["offered"] == n and not phase["failures"]
    assert phase["readback"] == {"journalEntries": n, "fields": n}
    ids = {r["id"]: r for r in phase["rows"]}
    assert len(ids) == n == len(phase["rows"]) == len({r["t"] for r in ids.values()})
    assert sorted(r["p"] for r in ids.values()) == list(range(base+1, base+n+1))
    for offer in plan["schedule"]:
        key = "-".join(str(k) for k in (plan["label"], offer["account"], offer["person"], offer["ordinal"]))
        row = ids[key]
        assert (row["account"],row["person"],row["due"]) == (offer["account"],offer["person"],offer["ms"])
        assert row["due"] <= row["hand"] < row["end"] and int(row["t"]) > 0
    return n


def bind_restore(campaign, request, placements, pins, start):
    arm = request["arm"]
    proof = campaign.parent/"restore-proofs"/("restore-"+arm["slot"]+"-pg.json")
    assert proof.stat().st_mtime >= start
    pg, = [r for r in placements if r["role"] == "pg"]
    assert read(proof) == {"source":arm["source"],"container":pg["id"],**pins}
    return sha(proof)


def collect(item, repo, campaign, small):
    pin, _ = source.PRODUCERS[item]
    plans = inputs(repo, item, small)
    control = campaign.parent
    expected_names = ("j21-g1-writer2","j25-g1","j25-zgc","j25-g1-zgc-memory")
    seed = read(control.parent/"day-n20-jvm1/seed/seed.json")
    pins = dict(logicalDumpSha256=seed["dumpSha256"],seedCut=seed["seedCut"],
                physicalManifestSha256=sha(control.parent/"day-n20-jvm1/cold-postgres.json"))
    outputs = []
    mode = "results/" if item == "jvm25" else ""
    manifest = campaign/(mode+"comparison.json")
    comparison = read(manifest)
    assert comparison["source"] == pin
    if item == "jvm25":
        names = tuple(r["name"] for r in comparison["results"])
        assert names == expected_names[:1] if small else names in (expected_names[:3],expected_names)
    else:
        names = tuple("cache-"+str(r["cache"]) for r in comparison["results"])
        assert names == ("cache-256","cache-2560") or names == ("cache-256","cache-2048")
        assert comparison["seedSha256"] == seed["dumpSha256"]
    for name, result in zip(names, comparison["results"], strict=True):
        directory = campaign/(mode+name)
        request_file = directory/"request.json"
        request = read(request_file)
        assert request["seed"] == seed and request["arm"] == result["arm"] and result["arm"]["source"] == pin
        slot = request["arm"]["slot"]
        start = request_file.stat().st_mtime
        if "startedAt" in request:
            assert request["startedAt"]/1000 <= start
        completed = directory/("field-summary.json" if item == "jvm25" else "joined.json")
        assert start <= completed.stat().st_mtime <= request["deadline"]/1000 + 1
        assert completed.stat().st_mtime <= manifest.stat().st_mtime
        placed = read(directory/"placements.json")["engines"]
        clone = bind_restore(campaign, request, placed, pins, start-.1)
        assert read(directory/"cleanup.json") == {"containers":[],"volumes":[],"networks":[]}
        roles = {r["role"]: {"id":r["id"],"cores":len(r["cpus"].split(","))} for r in placed if r["role"]!="pg"}
        n = 0
        if item == "jvm25":
            assert read(directory/"result.json") == result and result["dumpSha256"] == seed["dumpSha256"]
            assert result["evidenceSha256"] == sha(directory/"field-summary.json")
            for raw, plan in zip(result["jvm"]["reads"], plans, strict=True):
                label = plan["label"]
                n += native_phase(read(directory/(label+".json")), plan, seed["seedCut"]+n)
                file = directory/(label+"-reads.json")
                receipt = read(file)
                assert raw["sha256"] == sha(file) and receipt["cut"] == seed["seedCut"]
                assert raw["label"] == label and len(receipt["samples"]) == raw["count"] == (2 if small else 60)
                assert all(s["rows"] > 0 and s["ms"] >= 0 for s in receipt["samples"])
            for gc in result["jvm"]["gc"]:
                logfile = directory/(gc["role"]+"-gc-observed.log")
                assert gc["sha256"] == sha(logfile) and gc["containerId"] == roles[gc["role"]]["id"]
                assert logfile.read_bytes().startswith(b"[20")
                roles[gc["role"]].update(collector=gc["collector"], pauses=gc["pauseCount"], stalls=gc["allocationStalls"])
        else:
            phase = read(directory/"window.json")
            assert phase["arm"] == request["arm"]
            n = native_phase(phase["phase"], plans[0], seed["seedCut"])
            joined_file = directory/"joined.json"
            joined = read(joined_file)["joined"]
            assert result["sha256"] == sha(joined_file) and len(joined) == n
            assert {int(r["t"]) for r in joined} == {int(r["t"]) for r in phase["phase"]["rows"]}
            for role in roles:
                log = directory/"engines"/slot/"trace/raw"/(role+".log")
                with log.open("rb") as stream:
                    assert stream.read(3) == b"[20"
                    assert b"Using G1" in stream.read(4096)
                roles[role].update(collector="G1", pauseLogSha256=sha(log))
        assert set(roles) == {"tx","gw-r","gw-w"}
        outputs.append(dict(name=name, slot=slot, n=n, roles=roles, restoreSha256=clone))
    return dict(producer=pin, small=small, comparisonSha256=sha(manifest), arms=outputs)


if __name__ == "__main__":
    name, build, root, mode = sys.argv[1:]
    print(json.dumps(collect(name,Path(build),Path(root),mode=="small"), indent=2))
