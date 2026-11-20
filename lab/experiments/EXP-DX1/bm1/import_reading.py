"""Reconcile HA1's published one-host import observations with its offer tapes."""

from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import re

from producer_readings import digest, get


TAIL_ARMS = ("tail-0-a", "tail-128", "tail-500", "tail-2000", "tail-0-b")
SPLIT_ARMS = ("split-0-a", "split-2000", "split-0-b")
MICRO_ARMS = ("micro-0-a", "micro-24", "micro-16", "micro-32", "micro-0-b")


def read_arm(directory, attempt, name, rate=50, *, split=False, micro=False, duration=108_000):
    # [DX-BM1] Why: join every scheduled offer and bulk ACK to this scope's immutable receipt.
    # Rejected: accepting an open-loop p99 after dropping expired, missing, or unverified offers.
    f = directory / (name + ".offers.json")
    tape = get(f)
    scope = "tx2-ha1-" + attempt["nonce"][:8] + "-" + name
    assert (tape["nonce"], tape["source"], tape["slot"], tape["scope"], tape["duration"]) == (
        attempt["nonce"], attempt["source"]["git"], attempt["slot"], scope, duration)
    assert math.isfinite(tape["start"])
    due = {(actor, kind, i): i * 200 for actor, kind in (("quiet", "save"), ("quiet", "read")) for i in range(duration//200)}
    due.update({("live" + str(i % 10), "save", i): i * (1000//rate) for i in range(rate*duration//1000)})
    if split or micro:
        due.update({("live" + str(i % 10), "read", i): i * 20 for i in range(duration//20)})
    native = {row["command"]: row["position"] for row in tape["native"]}
    assert len(native) == len(tape["native"]) == len(set(native.values()))
    bins = defaultdict(lambda: defaultdict(list))
    for row in tape["samples"]:
        actor, kind, seq = row["actor"], row["kind"], row["seq"]
        assert due.pop((actor, kind, seq)) == row["due"]
        assert math.isfinite(row["offered"]) and math.isfinite(row["end"])
        assert row["outcome"] != "pending" and row["end"] >= row["offered"] >= row["due"] - 5
        if kind == "save" and row["outcome"] == "verified":
            assert native[f"save/{actor}/{seq}"] == row["seen"]["position"] > 0
        bins[actor][kind].append(row)
    assert not due
    neighbors = {}
    for actor, kinds in bins.items():
        neighbors[actor] = {}
        for kind in ("save", "read"):
            rows = kinds[kind]
            # [DX-BM1] Why: preserve the signed offer clock within the verified scheduler tolerance.
            # Rejected: clamping an early reply to zero or rejecting the complete producer ledger.
            values = sorted(r["end"] - r["due"] for r in rows if r["outcome"] == "verified")
            p99 = values[(99 * len(values) + 99) // 100 - 1] if values else None
            neighbors[actor][kind] = dict(offered=len(rows), ok=len(values), p99Ms=p99,
                                          outcomes=dict(Counter(r["outcome"] for r in rows)))
    frames = tape["ordered"]
    assert len({r["command"] for r in frames}) == len(frames)
    for row in frames:
        assert row["first"] < row["end"] and row["facts"] > 0
        assert row["offer"] < duration and row["ack"] >= row["offer"]
        assert native[row["command"]] == row["position"]
    facts = sum(r["facts"] for r in frames if r["ack"] <= duration)
    if split:
        assert not frames
        if name=="split-2000":
            imported=get(directory/(name+"-split.offers.json"))
            assert [imported[k] for k in ("nonce","source","slot","scope","arm","duration","width","peak")]==[
                attempt["nonce"],attempt["source"]["git"],attempt["slot"],scope+"-import",name,duration,2000,2]
            assert math.isfinite(imported["start"])
            issued=imported["issued"]
            assert issued and len({row["command"] for row in issued})==len(issued)
            assert sorted(row["position"] for row in issued)==list(range(2,len(issued)+2))
            for index,row in enumerate(sorted(issued,key=lambda row:row["first"])):
                assert row["first"]==index*250 and row["end"]==row["first"]+250 and row["facts"]==2000
                assert re.fullmatch(r"load1/[a-f0-9]{64}/"+str(row["first"]),row["command"])
                assert re.fullmatch(r"[a-f0-9]{64}",row["digest"])
                assert -5<=row["offered"]<duration and row["settled"]>=row["offered"]
            facts=sum(row["facts"] for row in issued if row["settled"]<=duration)
            assert facts==imported["facts"]
    if name in (TAIL_ARMS[0], TAIL_ARMS[-1]):
        assert not frames
    return dict(arm=name, scope=scope, duration=duration, rate=rate, neighbors=neighbors, facts=facts,
                fps=facts / (duration / 1000), tapeSha256=digest(f))


def micro_output(directory, source, slot, start, *, capacity="one-host"):
    # [DX-BM1] Why: use fixed offer denominators and the last queryable prefix in the window.
    # Rejected: granting progress from frames still in flight or accepting one of the two controls.
    attempt = get(directory / "attempt.json")
    nonce = attempt["nonce"]
    assert attempt["mode"] == "load-micro" and re.fullmatch(r"[a-f0-9-]{36}", nonce)
    assert directory.name == "load-micro-" + nonce
    assert attempt["source"]["git"] == source and attempt["slot"] == slot
    assert get(directory / "cleanup.json") == dict(nonce=nonce, containers=0, networks=0)
    report = directory / "observations.json"
    published = get(report)
    assert (published["nonce"], published["slot"], published["source"]) == (nonce, slot, attempt["source"])
    assert published["profile"] == dict(people=50, capacity=capacity, scopes=1)
    assert [row["arm"] for row in published["result"]] == list(MICRO_ARMS)
    assert len({row["sourceSeal"] for row in published["result"]}) == 1
    results = []
    for arm, width in zip(published["result"], (0, 24, 16, 32, 0)):
        name = arm["arm"]
        tape_path = directory / (name + ".offers.json")
        individual = directory / ("arm-" + name + ".json")
        assert start - 2 <= tape_path.stat().st_mtime <= report.stat().st_mtime
        assert start - 2 <= individual.stat().st_mtime <= report.stat().st_mtime
        assert get(individual) == arm
        assert arm["width"] == width
        checked = read_arm(directory, attempt, name, micro=True)
        assert all(arm[k] == v for k, v in checked.items() if k != "tapeSha256")
        tape = get(tape_path)
        assert tape["hz"] == 130 and arm["offeredFrames"] == 14_040
        assert tape["lostReplies"] == int(width != 0)
        native = {row["command"]: row for row in tape["native"]}
        frames = {}
        stop = 0
        ack = 0
        for row in tape["ordered"]:
            assert width and row["first"] == stop and row["end"] - stop == width // 8
            assert row["facts"] == width and row["offer"] >= ack
            stop, ack = row["end"], row["ack"]
            bound = native[row["command"]]
            assert bound["position"] not in frames
            assert bound["grant"]["bulk"] and not bound["grant"]["runnable-live"]
            service = row["service"]
            assert service["ms"] == bound["serialHold"]["end"] - bound["serialHold"]["start"] > 0
            assert 0 < service["rows"] <= 96 and 0 < service["bytes"] <= 65536
            frames[bound["position"]] = row
        prior = queryable = 0
        for marker in tape["markers"]:
            row = frames[marker["position"]]
            assert row["first"] == marker["first"] and row["end"] == marker["end"]
            assert row["position"] > prior and marker["done"] >= row["ack"]
            assert re.fullmatch(r"[a-f0-9]{64}", marker["digest"])
            prior = marker["position"]
            if marker["done"] <= arm["duration"]:
                queryable = row["end"] * 8
        assert arm["queryableFacts"] == queryable and arm["completedBulk"] == stop * 8
        assert arm["committedFrames"] == len(frames) == arm["proof"]["observed"]
        assert arm["proof"]["facts"] == arm["completedBulk"] and arm["proof"]["cursor"] == stop
        assert arm["cycleOverBudget"] == sum(r["ack"] - r["offer"] > 8 for r in tape["ordered"])
        assert len(tape["temporal"]) == arm["temporal"] == (3 if width else 0)
        for row in tape["temporal"]:
            assert native[row["command"]]["position"] == row["position"]
        results.append({**checked, "width": width, "queryableFacts": queryable,
                        "queryablePerSecond": queryable / (arm["duration"] / 1000),
                        "committedFrames": len(frames), "armSha256": digest(individual)})
    return {"source": source, "slot": slot, "nonce": nonce, "observationsSha256": digest(report), "arms": results}


PIPELINE_ARMS = ("pipeline-0-a", "pipeline-16-2", "pipeline-24-2", "pipeline-16-1", "pipeline-24-1",
                 "pipeline-16-4", "pipeline-24-4", "pipeline-16-8", "pipeline-24-8", "pipeline-0-b")


def pipeline_output(directory, source, slot, start, *, small=False):
    attempt = get(directory/"attempt.json")
    report = directory/"observations.json"
    body = get(report)
    nonce = attempt["nonce"]
    width_duration = 18_000 if small else 108_000
    assert directory.name == "load-pipeline-"+nonce and attempt["mode"] == "load-pipeline"
    assert (body["source"],body["slot"],body["nonce"]) == (attempt["source"],slot,nonce)
    assert attempt["source"]["git"] == source and attempt["slot"] == slot
    assert get(directory/"cleanup.json") == {"nonce":nonce,"containers":0,"networks":0}
    names = ("pipeline-16-4", "pipeline-24-8") if small else PIPELINE_ARMS
    results = []
    for name, arm in zip(names, body["result"], strict=True):
        tape_path = directory/(name+".offers.json")
        individual = directory/("arm-"+name+".json")
        assert start - 2 <= tape_path.stat().st_mtime <= report.stat().st_mtime
        assert get(individual) == arm and arm["arm"] == name
        checked = read_arm(directory, attempt, name, arm["rate"], micro=True, duration=width_duration)
        assert checked["neighbors"] == arm["neighbors"]
        tape = get(tape_path)
        assert tape["hz"] == 240 and arm["offeredFrames"] == width_duration * 240 // 1000
        width = int(name.split("-")[1])
        assert arm["width"] == width
        assert tape["lostReplies"] == (2 if width else 0)
        commands = sorted(tape["ordered"], key=lambda r: r["first"])
        seen = {r["position"]:r for r in commands}
        for i, frame in enumerate(commands):
            assert width and frame["first"] == i*(width//8) and frame["end"] == (i+1)*(width//8)
            assert frame["facts"] == width
        latest = 0
        for marker in tape["markers"]:
            if marker["done"] <= width_duration:
                latest = max(latest, marker["end"])
            assert marker["end"] == seen[marker["position"]]["end"]
        assert arm["queryableFacts"] == latest*8
        results.append(dict(arm=name, width=width, offers=sum(x["offered"] for values in checked["neighbors"].values() for x in values.values()),
                            queryableFacts=latest*8, queryablePerSecond=latest*8000/width_duration,
                            neighbors=checked["neighbors"], sha256=digest(tape_path)))
    def pairs(cells):
        before = cells[0]
        after = cells[-1] if cells[-1]["arm"] == "pipeline-0-b" else None
        def ratio(matched, account, kind, own):
            if matched is None:
                return None
            control = matched["neighbors"][account][kind]
            return {**control, "ratio": own["p99Ms"]/control["p99Ms"] if own["p99Ms"] is not None and control["p99Ms"] else None}
        rows = []
        for cell in cells[1:-1 if after else None]:
            accounts=[dict(account=account, operations=[dict(kind=kind, **own,
                        before=ratio(before,account,kind,own),after=ratio(after,account,kind,own))
                        for kind,own in counts.items()]) for account,counts in cell["neighbors"].items()]
            rows.append(dict(arm=cell["arm"],queryableFactsPerSecond=cell["queryablePerSecond"],accounts=accounts))
        return rows
    comparisons = []
    if not small:
        # Use the producer's account row ordering and independently reconstructed per-account outcomes.
        for row,original in zip(results,body["result"],strict=True):
            row["neighbors"] = {key:row["neighbors"][key] for key in original["neighbors"]}
        comparisons = pairs(results)
        assert get(directory/"load-pipeline-comparison.json") == comparisons
        assert get(directory/"load-pipeline-early.json") == pairs(results[:3])
    return dict(source=source, slot=slot, nonce=nonce, observationsSha256=digest(report), arms=results, comparisons=comparisons)


def tail_attempt(root, r):
    campaign = get(root / "campaign.json")
    assert (campaign["tag"], campaign["sha"], campaign["mode"], campaign["sizes"], campaign["layout"]) == (
        r["tag"], r["source"], "load-tail", [50], "one-host")
    assert re.fullmatch(r"[a-f0-9-]{36}", campaign["campaign"])
    directory, = root.glob("load-tail-*")
    attempt = get(directory / "attempt.json")
    assert directory.name == "load-tail-" + attempt["nonce"]
    assert attempt["mode"] == "load-tail" and attempt["slot"] == r["tag"] and attempt["source"]["git"] == r["source"]
    assert get(directory / "cleanup.json") == dict(nonce=attempt["nonce"], containers=0, networks=0)
    path = directory / "observations.json"
    assert path.stat().st_mtime >= r["start"] - 2
    published = get(path)
    assert (published["nonce"], published["slot"], published["source"]) == (attempt["nonce"], r["tag"], attempt["source"])
    assert published["profile"] == dict(people=50, capacity="one-host", scopes=1)
    assert [row["arm"] for row in published["result"]] == list(TAIL_ARMS)
    assert len({row["sourceSeal"] for row in published["result"]}) == 1
    rows = []
    for name, expected in zip(TAIL_ARMS, published["result"]):
        assert (directory / (name + ".offers.json")).stat().st_mtime >= r["start"] - 2
        row = read_arm(directory, attempt, name)
        assert all(expected[k] == v for k, v in row.items() if k != "tapeSha256")
        assert get(directory / ("arm-" + name + ".json")) == expected
        rows.append(row)
    return path, rows


def split_output(directory, source, slot, rate, start, *, capacity="one-host"):
    # [DX-BM1] Why: the live-side tape and the separate writer's durable imports have different receipt streams.
    # Rejected: granting the import rate from a packaging receipt or from the live writer's tape alone.
    attempt=get(directory/"attempt.json")
    nonce=attempt["nonce"]
    assert re.fullmatch(r"[a-f0-9-]{36}",nonce)
    assert attempt["mode"] in ("load-split-sql","load-split-pg")
    assert directory.name==attempt["mode"]+"-"+nonce
    assert attempt["source"]["git"]==source and attempt["slot"]==slot
    assert get(directory/"cleanup.json")=={"nonce":nonce,"containers":0,"networks":0}
    report=directory/"observations.json"
    assert report.stat().st_mtime>=start-2
    value=get(report)
    assert (value["source"],value["nonce"],value["slot"])==(attempt["source"],nonce,slot)
    assert value["profile"]=={"people":rate,"capacity":capacity,"scopes":1}
    assert [arm["arm"] for arm in value["result"]]==list(SPLIT_ARMS)
    assert len({arm["sourceSeal"] for arm in value["result"]})==1
    rows=[]
    for arm in value["result"]:
        name=arm["arm"]
        assert (directory/(name+".offers.json")).stat().st_mtime>=start-2
        row=read_arm(directory,attempt,name,rate,split=True)
        assert all(arm[k]==v for k,v in row.items() if k!="tapeSha256")
        assert get(directory/("arm-"+name+".json"))==arm
        transfer=directory/(name+"-split.offers.json")
        if name=="split-2000":
            assert transfer.stat().st_mtime>=start-2
            raw=get(transfer)
            isolated=arm["isolated"]
            assert [isolated[k] for k in ("nonce","source","slot","scope","start","duration","width","peak","facts")]==[
                raw[k] for k in ("nonce","source","slot","scope","start","duration","width","peak","facts")]
            assert isolated["type"]=="done" and isolated["sourceSeal"]==arm["sourceSeal"]
            proof=isolated["proof"]
            frames=len(raw["issued"])
            assert proof=={"cut":frames+1,"observed":frames,"facts":frames*2000,"cursor":frames*250}
            assert arm["committedFrames"]==frames and arm["completedBulk"]==proof["facts"]
            row["importTapeSha256"]=digest(transfer)
        else:
            assert not transfer.exists() and arm["committedFrames"]==arm["completedBulk"]==0
        rows.append(row)
    return {"mode":attempt["mode"],"rate":rate,"source":source,"slot":slot,"nonce":nonce,
            "observationsSha256":digest(report),"arms":rows}
