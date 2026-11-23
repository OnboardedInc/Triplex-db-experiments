"""Join one prepared-writer arm's offered tape, checked journal receipts and native append trace."""

import collections
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path
from rolling_latency import PhaseLatency, safepoints


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def percentile(xs, fraction):
    return sorted(xs)[math.ceil(len(xs) * fraction) - 1] if xs else None


def p99(xs):
    return percentile(xs, .99)


def rolling_metrics(result, rows, selection):
    end = result["seconds"] * 1000
    holds, events, turns = [], [], collections.defaultdict(list)
    for row in rows:
        if "sent" not in row:
            assert row.get("reason") == "expired"
            continue
        assert row.get("ack") and row["due"] <= row["creditGranted"] <= row["sent"] <= row["end"] <= row["creditReleased"]
        assert row["creditGranted"] < row["due"] + 30_000
        if selection.get("freshFirst") and row["account"] != 0:
            assert row["overdueAtGrant"] == (row["due"] < row["creditGranted"] - 20)
        else:
            assert "overdueAtGrant" not in row
        holds.append(row["creditReleased"] - row["creditGranted"])
        turns[row["fairTurn"]].append(row)
        events.extend(((row["creditGranted"], 1, row["fairTurn"], row),
                       (row["creditReleased"], 0, row["fairTurn"], row)))

    # [DX-PREP1] Why: reconstruct outstanding neighbour tickets from independently observed grant/release times.
    # Rejected: trusting the producer's reported outstanding count or treating rolling tickets as barrier turns.
    width = selection["credits"]
    if selection["mode"] == "rolling":
        assert sorted(turns) == list(range(1, len(turns) + 1)) and all(len(v) == 1 for v in turns.values())
        active, neighbours = set(), 0
        for _, grant, ticket, row in sorted(events, key=lambda e: e[:3]):
            if grant:
                assert row["neighboursAhead"] == neighbours
                active.add(ticket)
                neighbours += int(row["account"] != 0)
                assert 0 <= neighbours < width and len(active) <= width
            else:
                assert ticket in active
                active.remove(ticket)
                neighbours -= int(row["account"] != 0)
        assert not active and neighbours == 0
    # [DX-PREP1] Why: sorting by scheduled offer restores the order that the workload promised per subject.
    # Rejected: counting globally contiguous journal positions as evidence for per-person FIFO.
    last_subject_position = {}
    for row in rows:
        if row.get("receipt"):
            subject = row["account"], row["person"]
            assert row["receipt"]["p"] > last_subject_position.get(subject, 0)
            last_subject_position[subject] = row["receipt"]["p"]

    def stats(low, high):
        offered = [row for row in rows if low <= row["due"] < high]
        acked = [r["end"] - r["due"] for r in offered if r.get("ack")]
        quiet = [r["end"] - r["due"] for r in offered if r.get("ack") and r["account"] == 0]
        in_window = sum(r.get("ack") is not None and low <= r["end"] < high for r in rows)
        return dict(rate=in_window * 1000 / (high-low), offers=len(offered), acks=len(acked),
                    expired=len(offered)-len(acked), ackedP50Ms=percentile(acked, .5),
                    ackedP99Ms=p99(acked), quietP99Ms=p99(quiet))

    return dict(selection=selection, overdueGrants=sum(r.get("overdueAtGrant", False) for r in rows),
                whole=stats(0, end), firstHalf=stats(0, end/2),
                secondHalf=stats(end/2, end), creditHoldP99Ms=p99(holds),
                barrierHoldP99Ms=p99([max(r["creditReleased"] for r in v) - min(r["creditGranted"] for r in v)
                                       for v in turns.values()]) if selection["mode"] == "barrier" else None)


def rolling_counters(directory, root, header, live, masks=None, memory_limits=None):
    ready = read(directory / "counters-ready.json")
    assert (ready["source"], ready["slot"], ready["attempt"], ready["boot"]) == (
        header["commit"], header["slot"], header["nonce"], (directory / "boot-id").read_text().strip())
    assert ready["sender"] > 1 and ready["ticks"] > 0
    assert {role: (v["id"], v["pid"]) for role, v in ready["roles"].items()} == {
        c["Name"].removeprefix("/"+header["slot"]+"-"): (c["Id"], c["State"]["Pid"]) for c in read(live)}
    if masks is not None:
        assert ready["masks"] == {role: [int(cpu) for cpu in mask.split(",")] for role, mask in masks.items()}
    if memory_limits is not None:
        assert ready["memoryMax"] == memory_limits
        total, available = (ready["hostMemoryKiB"][k] for k in ("MemTotal", "MemAvailable"))
        assert total*1024 - sum(memory_limits.values()) >= 10 << 30 and 0 < available <= total
    counters = directory / "counters.ndjson"
    samples = [json.loads(line) for line in counters.read_text().splitlines()]
    assert len(samples) > 60
    for i, s in enumerate(samples):
        assert int(s["monoNs"]) <= int(s["endMonoNs"])
        assert s["cpu"].keys() == ready["roles"].keys() and s["pg"]["durable"] == "on"
        assert {"wal_write", "wal_sync", "wal_write_time", "wal_sync_time"} <= s["pg"]["wal"].keys()
        assert {"num_timed", "num_requested", "write_time", "sync_time"} <= s["pg"]["checkpointer"].keys()
        assert s["pg"]["io"] and s["pg"]["backend"] == samples[0]["pg"]["backend"]
        if memory_limits is not None:
            assert s["memory"].keys() == memory_limits.keys()
            assert all(all(isinstance(m[k], int) and m[k] >= 0 for k in ("current", "anon", "file"))
                       and "oom_kill" in m["events"] for m in s["memory"].values())
        if i:
            prior = samples[i-1]
            assert 0 < int(s["monoNs"]) - int(prior["monoNs"]) <= 3_000_000_000
            assert s["senderTicks"] >= prior["senderTicks"]
            assert all(s["cpu"][r]["usage_usec"] >= prior["cpu"][r]["usage_usec"] for r in s["cpu"])
    index = root / "prep1-index.ndjson"
    index_rows = [json.loads(line) for line in index.read_text().splitlines()]
    assert index_rows and all(r["attempt"] == header["nonce"] for r in index_rows)
    assert index_rows[-1] == {"attempt": header["nonce"], "type": "end", "dropped": 0}
    assert any(r.get("observer", {}).get("status") == "installed" for r in index_rows)
    assert any(r.get("gauges", {}).get("MemoryIndexMB") is not None for r in index_rows)
    jobs, pg = root / "prep1-index-jobs.log", directory / "postgres.log"
    assert jobs.is_file() and pg.stat().st_size > 0
    return [directory / "counters-ready.json", counters, index, jobs, pg], samples


def rolling_cpu(samples, result, ticks):
    start = int(result["phaseStartNs"])
    half = result["seconds"] * 500_000_000
    times = [int(s["monoNs"]) for s in samples]

    def span(lo, hi):
        before = samples[min(range(len(samples)), key=lambda i: abs(times[i] - lo))]
        after = samples[min(range(len(samples)), key=lambda i: abs(times[i] - hi))]
        elapsed = (int(after["monoNs"]) - int(before["monoNs"])) / 1e9
        assert elapsed > 0
        roles = {}
        for role, cpu in after["cpu"].items():
            delta = {k: cpu[k] - before["cpu"][role][k] for k in ("usage_usec", "nr_throttled", "throttled_usec")}
            assert all(v >= 0 for v in delta.values())
            roles[role] = dict(meanCores=delta["usage_usec"] / (elapsed * 1e6),
                               throttledPeriods=delta["nr_throttled"], throttledMs=delta["throttled_usec"]/1e3)
        return dict(seconds=elapsed, roles=roles, senderMeanCores=(after["senderTicks"] - before["senderTicks"])/(ticks*elapsed))

    return dict(firstHalf=span(start, start + half), secondHalf=span(start + half, start + 2*half))


def collect(plan_path, directory, native_path, allow_fixture=False):
    if not __debug__:
        raise RuntimeError("Assertions must remain enabled for evidence binding")
    plan, header, complete = (read(p) for p in (plan_path, directory / "header.json", directory / "complete.json"))
    fixture = header.get("fixture", False)
    assert fixture == allow_fixture
    for key in ("nonce", "slot", "commit"):
        assert complete[key] == header[key]
    arm = next(a for a in plan["arms"] if a["id"] == header["arm"]["id"])
    assert {k: v for k, v in arm.items() if k != "cells"} == header["arm"]
    assert plan["seconds"] == header["seconds"]
    campaign = plan.get("campaign", "comparison")
    assert campaign in ("comparison", "fair", "owner", "storage", "storage-ordered", "ceiling", "scale", "tail", "tail-combined", "rolling")
    scale = campaign == "scale"
    rolling = campaign == "rolling"
    cache32_ids = ("1-rolling6-cache32-S", "1-rolling6-tx5-cache32-S")
    cache32 = arm["id"] in cache32_ids
    tx5 = arm["id"] in ("1-rolling6-tx5-S", cache32_ids[1])
    fresh_credits = plan.get("freshCredits")
    assert fresh_credits is None or (rolling and fresh_credits in (6, 12))
    wide = campaign == "ceiling" or scale or rolling
    pg_data = False
    pg_data_evidence = []
    tail = campaign in ("tail", "tail-combined")
    storage = campaign in ("storage", "storage-ordered") or wide or tail
    ordered_ids = arm.get("orderedIds", False)
    followup = campaign != "comparison"
    fair_credits = header.get("fairCredits", 0)
    assert fair_credits in ((6, 8, 12, 16) if rolling else (0, 1, 2, 6)) and (not fair_credits or arm["writer"] == "S")
    expected_credits = arm.get("admission", {}).get("credits", arm.get("credits", plan.get("fairCredits", 0)))
    assert fair_credits == (expected_credits if arm["writer"] == "S" else 0)
    if campaign == "fair":
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["credits"]) for a in plan["arms"]] == [
            ("1-off-S", 1, "S", False, 0), ("1-on-S", 1, "S", False, 1),
            ("2-on-S", 2, "S", True, 1), ("2-off-S", 2, "S", True, 0),
        ]
    if campaign == "owner":
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["numericOwner"])
                for a in plan["arms"]] == [
            ("1-group-K", 1, "K", False, False), ("1-old-S", 1, "S", False, False),
            ("1-fixed-S", 1, "S", False, True),
        ]
        assert fair_credits == 0
    if tail:
        names = ("combined",) if campaign == "tail-combined" else ("control", "wal", "zgc", "fair")
        assert [(a["id"], a["tail"], a["credits"]) for a in plan["arms"]] == [
            (f"1-tail-{name}-S", name, 6 if name in ("fair", "combined") else 0) for name in names]
        assert all(a["writer"] == "S" and a["writers"] == 1 and a["numericOwner"]
                   and a["orderedIds"] and not a["reverse"] and not a["prefetch"] and a["cacheGiB"] == 2
                   for a in plan["arms"])
    elif rolling:
        observed = [(a["id"], a["admission"]) for a in plan["arms"]]
        choices = [
            (f"1-{mode}{credits}-S", {"mode": mode, "credits": credits})
            for mode, credits in (("barrier", 6), ("rolling", 6), ("rolling", 8), ("rolling", 12), ("rolling", 16))]
        if cache32:
            assert fresh_credits is None and observed == [
                (name, dict(mode="rolling", credits=6)) for name in cache32_ids]
            assert all("writeJvm" not in a for a in plan["arms"])
        elif tx5:
            assert fresh_credits is None and observed == [("1-rolling6-tx5-S", dict(mode="rolling", credits=6))]
            assert "writeJvm" not in arm
        elif fresh_credits:
            base = dict(mode="rolling", credits=fresh_credits)
            fresh = dict(base, freshFirst=True)
            assert observed == [(f"1-{mode}{fresh_credits}-S", selection)
                                for mode, selection in (("rolling", base), ("fresh", fresh), ("fresh-zgc", fresh))]
            assert [a.get("writeJvm") for a in plan["arms"]] == [None, None, "j25-zgc"]
        else:
            assert observed == [choices[i] for i in (0, 1, 3)] or (len(observed) == 1 and observed[0] in choices)
        assert all(a["writers"] == 1 and a["writer"] == "S" and a["numericOwner"] and a["orderedIds"]
                   and not a["reverse"] and not a["prefetch"] and a["cacheGiB"] == (32 if cache32 else 16)
                   for a in plan["arms"])
    elif scale:
        assert [(a["id"], a["scale"], a["cacheGiB"], a["credits"]) for a in plan["arms"]] == [
            (f"1-scale-{name}-S", name, size, 6) for name, size in (("base", 2), ("cache", 16), ("wal-zgc", 16))]
        assert all(a["writers"] == 1 and a["writer"] == "S" and a["numericOwner"] and a["orderedIds"]
                   and not a["reverse"] and not a["prefetch"] for a in plan["arms"])
    elif storage:
        controls = [
            ("1-group-K", 1, "K", False, False, False, 2, False),
            ("1-old-S", 1, "S", False, False, False, 2, False),
            ("1-fixed-S", 1, "S", False, True, False, 2, False),
            ("1-prefetch-S", 1, "S", False, True, True, 2, False),
            ("1-cache-S", 1, "S", False, False, False, 16, False),
        ]
        ordered_arm = ("1-ordered-S", 1, "S", False, True, False, 2, True)
        expected_arms = ([('1-ceiling-S', *ordered_arm[1:])] if wide else
                         controls + [ordered_arm] if campaign == "storage" else [ordered_arm])
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["numericOwner"], a["prefetch"],
                 a["cacheGiB"], a.get("orderedIds", False)) for a in plan["arms"]] == expected_arms
        assert fair_credits == 0
    if rolling:
        assert [(c["label"], c["rate"], c["offered"], c["fairCredits"]) for c in arm["cells"]] == [
            (f"r{rate}-{mode}", rate, round((3.5 if mode == "alone" else rate) * plan["seconds"]), fair_credits)
            for rate in ((394, 620) if tx5 or cache32 else (235, 394, 620)) for mode in ("alone", "loaded")]
    elif wide:
        variants = ((394, "on", 6), (620, "on", 6)) if scale else (
            (620, "off", 0), (620, "on", 6), (900, "on", 6), (900, "off", 0))
        assert [(c["label"], c["rate"], c["offered"], c["fairCredits"]) for c in arm["cells"]] == [
            (f"r{rate}-{kind}-{mode}", rate, round((3.5 if mode == "alone" else rate) * plan["seconds"]), credits)
            for rate, kind, credits in variants
            for mode in ("alone", "loaded")
        ]
    elif followup:
        phases = ("loaded", "alone") if arm["reverse"] else ("alone", "loaded")
        assert [(c["label"], c["rate"], c["offered"]) for c in arm["cells"]] == [
            (f"r{rate}-{phase}", rate, round((3.5 if phase == "alone" else rate) * plan["seconds"]))
            for rate in (235, 394) for phase in phases
        ]
    roles = ["tx", "gw-r", "gw-w"] + [f"gw-w{i}" for i in range(2, arm["writers"] + 1)]
    if not fixture:
        assert header["seconds"] == (300 if rolling else 90 if wide or tail else 60 if followup else 144)
        assert re.fullmatch(r"[0-9a-f]{40}", header["commit"])
        for key in ("seedSha", "gatewaySource"):
            assert re.fullmatch(r"[0-9a-f]{64}", header[key])
        seal = {name: digest for digest, name in (line.split() for line in
                (directory.parent / "SEAL.sha256").read_text().splitlines())}
        assert header["seedSha"] == seal["seed.json"] == sha(directory.parent / "seed.json")
        assert seal["plan.json"] == sha(plan_path)
        if wide:
            seed = read(directory.parent / "seed.json")
            pg_data = seed.get("storage") == "pg-data"
            assert not (scale or rolling) or pg_data
            assert (seed["facts"], seed["head"], seed["db"], seed["scope"]) == (
                162_456_470, 87002, header["db"], header["scope"]) and header["head"] == seed["head"]
            if not pg_data:
                assert seed["dumpSha256"] == header["dumpSha"]
            for key in ("imageSha256", "transferSha256"):
                assert header[key] == seed[key] and re.fullmatch(r"[a-f0-9]{64}", seed[key])
            assert header["commit"] == (directory.parent / "source").read_text().strip()
        if pg_data:
            assert set(seal) == {"seed.json", "plan.json"} and "dumpSha" not in header
            root = native_path.parents[2]
            copy, observed, live_pg = (root / "pgdata-copy.json", directory / "seed-readback.json", root / "containers.json")
            control, clone = root / "pgdata.control.sha256", root / "pgdata-copy-container.json"
            assert sha(copy) == header["pgDataCopySha"] and sha(observed) == header["seedReadbackSha"]
            copied, proof = read(copy), read(observed)
            for key, value in (("source", header["commit"]), ("slot", header["slot"]),
                               ("nonce", header["nonce"]), ("seedSha", header["seedSha"])):
                assert copied[key] == proof[key] == value
            assert copied["pgVersion"] == 17 and copied["volume"] == header["slot"] + "-pg-data"
            assert re.fullmatch(r"[0-9a-f]{64}", copied["sourceControlSha"])
            control_sha, *wal_digests = control.read_text().splitlines()
            assert copied["sourceControlSha"] == control_sha and copied["inspectSha"] == sha(clone)
            assert copied["helperSha"] == sha(Path(__file__).with_name("copy-pgdata.sh"))
            pg, = [c for c in read(live_pg) if c["Name"] == "/" + header["slot"] + "-pg"]
            mount, = [m for m in pg["Mounts"] if m["Destination"] == "/var/lib/postgresql/data"]
            assert pg["Image"] == copied["image"] and (mount["Type"], mount["Name"], mount["RW"]) == (
                "volume", copied["volume"], True)
            assert proof["pgDataCopySha"] == header["pgDataCopySha"] and proof["db"] == seed["db"]
            assert (proof["position"], proof["facts"], proof["members"]) == (87002, 162_456_470, 40)
            assert proof["owners"] == len({(o[1], o[2]) for tape in plan["tapes"].values() for o in tape})
            for key in ("journalSha", "predecessorSha"):
                assert re.fullmatch(r"[0-9a-f]{64}", proof[key])
            claim_key = json.dumps([json.loads(seed["scope"])[3], seed["loaderSeal"], 2000], separators=(",", ":"))
            loader = hashlib.sha256(claim_key.encode()).hexdigest()
            assert re.fullmatch(rf"load1/{loader}/[0-9]+", proof["command"]) and proof["claim"].startswith("_tx/")
            pg_data_evidence = [copy, observed, control, clone, live_pg]
            external_wal = rolling or (scale and arm["scale"] == "wal-zgc")
            if external_wal:
                device_path = directory.parent / "scale-wal-mount.json"
                device, = read(device_path)["filesystems"]
                assert re.fullmatch(r"/dev/nvme\d+n\d+(p\d+)?", device["source"]) if rolling else device["source"] == "/dev/nvme1n1"
                assert device["fstype"] == "ext4"
                wal_mount = str(Path(device["target"]) / header["slot"])
                wal, = [m for m in pg["Mounts"] if m["Destination"] == "/wal"]
                assert (wal["Type"], wal["Source"], wal["RW"]) == ("bind", wal_mount, True)
                assert copied["walDirectory"] == wal_mount
                assert [copied["walFilesSha"]] == wal_digests and re.fullmatch(r"[0-9a-f]{64}", wal_digests[0])
                pg_data_evidence.append(device_path)
            else:
                assert not wal_digests and all(m["Destination"] != "/wal" for m in pg["Mounts"])
        else:
            assert re.fullmatch(r"[0-9a-f]{64}", header["dumpSha"])
            assert header["dumpSha"] == seal["seed.pgdump"]
        if followup and not wide:
            # [DX-PREP1] Why: bind each mode to the earlier immutable seed and this fresh source.
            # Rejected: comparing two restores merely because they name the same population.
            original = (directory.parent / "comparison.SEAL.sha256").read_text().splitlines()
            assert len(original) == 3 and all(re.fullmatch(r"[a-f0-9]{64}  " + re.escape(name), line)
                for line, name in zip(original, ("seed.json", "seed.pgdump", "plan.json"), strict=True))
            assert original[:2] == [
                seal[name] + "  " + name for name in ("seed.json", "seed.pgdump")
            ]
            assert header["commit"] == (directory.parent / "source").read_text().strip()
        stack = read(native_path.parents[2] / "stack.json")
        assert stack["prefix"] == header["slot"]
        assert stack["gatewaySourceSha256"] == header["gatewaySource"]
        assert all(stack["durability"][k] == "on" for k in ("fsync", "synchronous_commit", "full_page_writes"))
        assert len(header["options"]) == arm["writers"]
        for option in header["options"]:
            assert option["database"] == header["db"] and option["position"] == header["head"]
            assert option["attempt"] == header["nonce"] and option["gatewaySourceHash"] == header["gatewaySource"]
            assert bool(option.get("subjectSave")) == (arm["writer"] == "S")
            assert bool(option.get("subjectNumericOwner")) == bool(arm.get("numericOwner"))
            assert bool(option.get("subjectPrefetch")) == bool(arm.get("prefetch"))
            assert option.get("subjectOrderedIds", False) == ordered_ids
            assert option["options"]["groupCommit"] == (arm["writer"] == "K")
            if arm["writer"] == "S":
                assert re.fullmatch(r":triplex\.subject/v-[0-9a-f]{24}", option["subjectFunction"])
                assert re.fullmatch(r"[1-9][0-9]*", option["subjectFunctionTx"])
        assert re.fullmatch(r"[0-9a-f-]{36}", (directory / "boot-id").read_text().strip())
        for role in roles:
            assert (native_path.parent / f"prep1-gc-{role}.log").stat().st_size > 0
            assert (native_path.parent / f"{role}-native-settings.json").stat().st_size > 0
        if storage:
            tx_jvm = read(native_path.parent / "tx-native-settings.json")
            assert (tx_jvm["run"], tx_jvm["slot"], tx_jvm["source"], tx_jvm["process"]) == (
                header["slot"], header["slot"], header["commit"], "tx")
            assert tx_jvm["jvm"]["objectCacheMax"] in (f'{arm["cacheGiB"]}g', f'{arm["cacheGiB"]*1024}m')
            assert tx_jvm["jvm"]["prefetchProbes"] == "true" and tx_jvm["jvm"]["prefetchEnabled"] is True
            heap = 48 if cache32 else 24
            assert (heap-1) << 30 <= tx_jvm["jvm"]["maxHeapBytes"] <= heap << 30
            tx_container, = [container for container in stack["containers"] if container["name"] == header["slot"] + "-tx"]
            assert tx_container["memory"] == (60 if cache32 else 30) << 30
        if scale or rolling:
            config = native_path.parents[2] / "config"
            masks = {"tx": "0,7,8" if rolling else "0" if arm["scale"] == "base" else "0,7-8",
                     "pg": "1", "gw-w": "2,3,4,5" if rolling else "2-5", "gw-r": "6"}
            if tx5:
                masks.update({"tx": "0,4,5,7,8", "gw-w": "2,3"})
            assert {c["name"].removeprefix(header["slot"]+"-"): c["cpuset"] for c in stack["containers"]} == masks
            memory_limits = None
            if cache32:
                memory_limits = {role: gib << 30 for role, gib in {"tx": 60, "pg": 8, "gw-w": 6, "gw-r": 5}.items()}
                assert {c["name"].removeprefix(header["slot"]+"-"): c["memory"] for c in stack["containers"]} == memory_limits
            base_image_path = config / "java-image.txt"
            zgc_image_path = config / ("tx-java-image.txt" if rolling else "tail-tx-image.txt")
            base_image = base_image_path.read_text().split("|")
            tx_image = zgc_image_path.read_text().split("|") if external_wal else base_image
            assert base_image[1] in ("21", "", "<no value>") and (tx_image[1] == "25") == external_wal
            pg_data_evidence.append(base_image_path)
            if external_wal:
                pg_data_evidence.append(zgc_image_path)
            write_path = config / "gw-w-java-image.txt"
            write_image = write_path.read_text().split("|") if fresh_credits else base_image
            assert not fresh_credits or (write_image[1] == "25") == (arm.get("writeJvm") == "j25-zgc")
            if fresh_credits:
                pg_data_evidence.append(write_path)
            for role in roles:
                container, = [c for c in stack["containers"] if c["name"] == header["slot"] + "-" + role]
                assert container["imageId"] == (tx_image if role == "tx" else write_image if role == "gw-w" else base_image)[0]
                log = (native_path.parent / f"prep1-gc-{role}.log").read_text()
                zgc = (role == "tx" and external_wal) or (role == "gw-w" and arm.get("writeJvm") == "j25-zgc")
                assert re.search(r"Using (?:The Z Garbage Collector|ZGC)" if zgc else "Using G1", log)
            settings_path = directory / "pg-settings.json"
            sql = read(settings_path)
            data, wal, data_dev, wal_dev = sql["layout"]
            assert wal == ("/wal/pg_wal" if external_wal else data + "/pg_wal") and (data_dev != wal_dev) == external_wal
            assert sql["settings"]["wal_sync_method"] == "fdatasync"
            assert all(sql["settings"][key] == "on" for key in ("fsync", "synchronous_commit", "full_page_writes"))
            pg_data_evidence.append(settings_path)
            if rolling:
                profile_file = directory / "launch-profile.json"
                profile = read(profile_file)
                if tx5 or cache32:
                    # [DX-PREP1] Why: reconcile the requested split with this slot's startup bytes and live affinity.
                    # Rejected: treating a declared core count or JVM option as an observed placement.
                    witnessed = [config.parent / "tx-startup-wait.log", directory / "gw-w-placement.log",
                                 config / "sql.properties"]
                    subprocess.run(["node", str(Path(__file__).with_name("rolling-launch.mjs")),
                                    arm["id"], str(profile_file), *map(str, witnessed)], check=True)
                    pg_data_evidence.extend(witnessed)
                if fresh_credits:
                    want_major = "25" if arm.get("writeJvm") else "21"
                    assert profile["creditMode"] == f"rolling{fair_credits}"
                    assert profile["gw-w"]["major"] == want_major and profile["gw-r"]["major"] == "21"
                    assert profile["tx"]["major"] == "25"
                assert sql["settings"]["track_io_timing"] == sql["settings"]["track_wal_io_timing"] == "on"
                assert sql["settings"]["log_checkpoints"] == "on" and sql["settings"]["max_wal_size"] == "1GB"
                assert (sql["settings"]["min_wal_size"], sql["settings"]["checkpoint_timeout"],
                        sql["settings"]["checkpoint_completion_target"], sql["settings"]["checkpoint_flush_after"]) == (
                            "80MB", "5min", "0.9", "256kB")
                extra, counters = rolling_counters(directory, native_path.parent, header, live_pg,
                                                   masks if tx5 or cache32 else None, memory_limits)
                pg_data_evidence.extend(extra + [profile_file])

    native, end, block_no = {}, False, 0
    tail_appends = {}
    with native_path.open() as file:
        for raw in file:
            row = json.loads(raw)
            assert not end and row["attempt"] == header["nonce"]
            if row.get("end") is True:
                assert row["dropped"] == 0
                end = True
                continue
            if row.get("tailAppend") is True:
                assert tail and row["start"] <= row["end"]
                interval = (row["start"], row["end"])
                assert interval not in tail_appends
                tail_appends[interval] = row
                continue
            if row["db"] != header["db"]:
                continue
            assert len(row["members"]) == len(row["bytes"]) > 0
            assert row["start"] <= row["end"]
            if tail and not fixture:
                detail = tail_appends[(row["start"], row["end"])]
                assert not detail.get("failed") and detail["db"] == row["db"] and detail["bytes"] == row["bytes"]
            block_no += 1
            for member, size in zip(row["members"], row["bytes"], strict=True):
                assert size > 0 and member["read-at"] <= member["started-at"] <= member["applied-at"] <= row["start"]
                t = str(member["t"])
                assert t not in native
                native[t] = (block_no, row, member)
    assert end

    metrics, used_native, cut, last_clock, last_turn = [], set(), header["head"], -math.inf, 0
    pauses = {}
    if rolling and not fixture:
        for role in ("tx", "gw-w", "gw-r"):
            with (native_path.parent / f"prep1-gc-{role}.log").open() as log:
                pauses[role] = safepoints(log)
    ordered_tokens = set()
    for expected in arm["cells"]:
        label = expected["label"]
        result = read(directory / (label + ".json"))
        cell_credits = expected.get("fairCredits", fair_credits)
        if wide:
            assert result["fairCredits"] == cell_credits
            last_turn = 0
        tape = plan["tapes"][label]
        assert result["label"] == label and result["rate"] == expected["rate"]
        assert result["head"] == cut and result["seconds"] == header["seconds"]
        assert expected["tapeSha"] == result["tapeSha"]
        assert len(tape) == len(result["rows"]) == expected["offered"]
        rows = sorted(result["rows"], key=lambda r: r["ordinal"])
        delay = PhaseLatency(result, pauses) if rolling and not fixture else None
        times, counts, block_ids, joined = collections.defaultdict(list), collections.Counter(), set(), set()
        in_window, stages_by_save, flush_ms = 0, collections.defaultdict(list), {}
        in_window_appends = set()
        cpu = {}
        if scale and not fixture:
            before, after = (result["transactorCpu"][edge] for edge in ("before", "after"))
            assert before["container"] == after["container"] == tx_container["id"]
            assert before["pid"] == after["pid"] > 1
            live_tx, = [c for c in read(live_pg) if c["Name"] == "/" + header["slot"] + "-tx"]
            assert (before["container"], before["pid"]) == (live_tx["Id"], live_tx["State"]["Pid"])
            start, end = int(before["monoNs"]), int(after["monoNs"])
            start_cell = int(result["phaseStartNs"])
            assert start <= start_cell < end and abs((end - start_cell) / 1e6 - result["drained"]) < 500
            used = after["usageUsec"] - before["usageUsec"]
            cores = 1 if arm["scale"] == "base" else 3
            assert 0 < used <= (end-start) / 1000 * (cores + 0.02)
            cpu = {"transactorCpuMeanCores": used*1000 / (end-start),
                   "transactorCpuSeconds": used / 1e6, "cpuWindowSeconds": (end-start) / 1e9}
        turns = collections.defaultdict(list)
        turn_appends = collections.defaultdict(set)
        prepared, hinted = 0, 0
        ordered_before = len(ordered_tokens)
        old_reads = collections.Counter()
        native_io = collections.defaultdict(list)
        for i, (r, offer) in enumerate(zip(rows, tape, strict=True)):
            assert (r["ordinal"], r["id"], r["due"], r["account"], r["person"]) == (
                i, f"{label}-{i}", offer[0], offer[1], offer[2])
            counts[r["account"]] += 1
            if "sent" in r:
                assert r["sent"] >= r["due"] and r["end"] >= r["sent"]
                assert 0 <= r["peer"] < arm["writers"]
                if cell_credits:
                    turns[r["fairTurn"]].append(r)
                if wide:
                    assert r["legacyPredecessors"] in (0, 1, 2)
            ack, receipt = r.get("ack"), r.get("receipt")
            token = r.get("orderedToken")
            assert bool(token) == (ordered_ids and "sent" in r)
            if token:
                # [DX-PREP1] Why: verify the producer's allocated token against the journal actually read.
                # Rejected: accepting an ordered-writer flag without binding it to the submitted identity.
                assert re.fullmatch(r"[0-7][0-9A-HJKMNP-TV-Z]{23}", token) and token not in ordered_tokens
                ordered_tokens.add(token)
                if receipt:
                    assert receipt["journal"] == "_tx/" + token + "00"
            if ack:
                assert receipt and not r.get("reason")
                assert (ack["operationId"], int(ack["position"]["v"]), ack["t"]["v"], ack["recordedAt"]["v"]) == (
                    r["id"], receipt["p"], receipt["t"], receipt["clock"])
                stages = ack["timeline"]
                assert stages["payloadPrepared"] <= stages["completed"] <= stages["responsePrepared"]
                stages_by_save["senderQueue"].append(r["sent"] - r["due"])
                stages_by_save["httpRoundTrip"].append(r["end"] - r["sent"])
                if ack.get("nativeComputeMs") is not None:
                    stages_by_save["nativeCompute"].append(ack["nativeComputeMs"])
                if (scale or rolling) and not fixture:
                    stages_by_save["gatewayPreparation"].append(stages["payloadPrepared"] / 1000)
                    stages_by_save["gatewayPredecessor"].append((stages["predecessorReady"] - stages["payloadPrepared"]) / 1000)
                    stages_by_save["submitToNativeEntry"].append(ack.get("submitToNativeEntryMs", 0))
                if "subjectHintsStarted" in stages:
                    assert arm.get("prefetch")
                    assert stages["payloadPrepared"] <= stages["subjectHintsStarted"] <= stages["subjectHintsFinished"] <= stages["submitted"]
                    stages_by_save["hintPreparationMs"].append((stages["subjectHintsFinished"] - stages["subjectHintsStarted"]) / 1000)
                if ack.get("subjectHintsAttached"):
                    assert arm.get("prefetch") and ack.get("subjectSave") and "subjectHintsFinished" in stages
                    hinted += 1
                if storage and not fixture:
                    reads = ack["nativeIoStats"]["reads"]
                    width = ack.get("groupSize", 1)
                    assert 1 <= width <= 8
                    native_io["applyMs"].append(ack["nativeComputeMs"] / width)
                    for counter in ("sql", "sql-ms", "deserialize-ms", "eavt-load", "aevt-load", "avet-load"):
                        native_io[counter].append(reads.get(counter, 0) / width)
                    if wide:
                        age = "seedPredecessor" if r["legacyPredecessors"] else "orderedPredecessor"
                        old_reads[(age, "saves")] += 1
                        old_reads[(age, "sql")] += reads.get("sql", 0)
                if ack.get("subjectSave"):
                    assert arm["writer"] == "S" and ack["subjectSave"] == ack["writePath"]["function"]
                    if not fixture:
                        assert ack["subjectSave"] == header["options"][r["peer"]]["subjectFunction"]
                    prepared += 1
                assert ack.get("subjectOrderedIds", False) == (ordered_ids and bool(ack.get("subjectSave")))
                times[r["account"]].append(r["end"] - r["due"])
                in_window += int(r["end"] <= result["seconds"] * 1000)
            else:
                assert r.get("reason")
            if receipt:
                block, chunk, member = native[receipt["t"]]
                assert int(result["phaseStartNs"]) <= member["started-at"]
                if delay and ack:
                    delay.add(r, chunk, member)
                if not fixture and ack:
                    assert chunk["end"] <= int(result["phaseStartNs"]) + math.ceil(r["end"] * 1e6) + 100000
                stages_by_save["nativeWork"].append((member["applied-at"] - member["started-at"]) / 1e6)
                stages_by_save["nativeReadyToAppend"].append((chunk["start"] - member["applied-at"]) / 1e6)
                flush_ms[block] = (chunk["end"] - chunk["start"]) / 1e6
                if int(result["phaseStartNs"]) <= chunk["end"] < int(result["phaseStartNs"]) + result["seconds"] * 1_000_000_000:
                    in_window_appends.add(block)
                if cell_credits:
                    turn_appends[r["fairTurn"]].add(block)
                joined.add(receipt["t"])
                block_ids.add(block)
        if wide and not fixture:
            assert len({p[2] for p in tape if p[1] == 0}) == round(result["seconds"] * 3.5)
            if label.endswith("-loaded"):
                assert [p for p in tape if p[1] == 0] == plan["tapes"][label.removesuffix("-loaded") + "-alone"]
                assert all(len({p[2] for p in tape if p[1] == a}) == 1900 for a in range(1, 10))
            elif not metrics:
                assert prepared > 0
        assert used_native.isdisjoint(joined)
        used_native.update(joined)
        positions = sorted((r["receipt"]["p"], r["receipt"]["clock"]) for r in rows if r.get("receipt"))
        for pos, clock in positions:
            assert pos == cut + 1 and clock > last_clock
            cut, last_clock = pos, clock
        assert cut == result["after"]
        if not rolling or arm["admission"]["mode"] == "barrier":
            last_reply = -math.inf
            for turn, members in sorted(turns.items()):
                assert turn == last_turn + 1 and len(members) <= cell_credits
                assert min(r["sent"] for r in members) >= last_reply
                last_reply = max(r.get("creditReleased", r["end"]) for r in members)
                last_turn = turn
        if rolling and not fixture:
            start = int(result["phaseStartNs"])
            stop = start + result["seconds"]*1_000_000_000
            assert int(counters[0]["monoNs"]) <= start < stop <= int(counters[-1]["monoNs"])
            assert sum(start <= int(s["monoNs"]) < stop for s in counters) >= result["seconds"] - 2
            cpu["rollingCpu"] = rolling_cpu(counters, result, read(directory / "counters-ready.json")["ticks"])
        if followup and not wide and not tail and cell_credits:
            assert all(len(blocks) == 1 for blocks in turn_appends.values())
        pair = {a: p99(times[a]) if counts[a] == len(times[a]) else None for a in counts}
        metrics.append({"cell": label, "offered": len(rows), "durable": len(positions), "inWindow": in_window,
                        **({"delayLedger": delay.finished()} if delay else {}),
                        **(rolling_metrics(result, rows, arm["admission"]) if rolling else {}),
                        **(cpu if rolling else {}),
                        "confirmedPerSecond": in_window / result["seconds"], "prepared": prepared,
                        "replans": sum(bool(r.get("ack", {}).get("subjectReplan")) for r in rows if r.get("ack")),
                        "missingAcks": sum(counts.values()) - sum(map(len, times.values())),
                        "outcomes": dict(collections.Counter(r.get("reason", "acked") for r in rows)),
                        "accountP99Ms": pair, "completedOnlyP99Ms": {a: p99(times[a]) for a in counts},
                        "worstAccountP99Ms": max(pair.values()) if all(v is not None for v in pair.values()) else None,
                        "stageP99Ms": {key: p99(samples) for key, samples in stages_by_save.items()},
                        "hintsAttached": hinted,
                        "orderedSubmitted": len(ordered_tokens) - ordered_before,
                        "orderedPrepared": prepared if ordered_ids else 0,
                        **({"fairCredits": cell_credits, "observedPeople": [len({p[2] for p in tape if p[1] == a}) for a in range(10)],
                            "readsByPredecessor": {age: {k: old_reads[(age, k)] for k in ("saves", "sql")}
                                                   for age in ("seedPredecessor", "orderedPredecessor")}} if wide else {}),
                        "nativeIoPerSave": {key: {"mean": sum(samples) / len(samples), "p99": p99(samples)}
                                            for key, samples in native_io.items()},
                        "appendP99Ms": p99(list(flush_ms.values())),
                        **({"appendMaxMs": max(flush_ms.values(), default=None)} if tail or scale else {}),
                        **({"appendsPerSecond": len(in_window_appends) / result["seconds"], **cpu} if scale else {}),
                        "fairTurns": len(turns), "maxAppendsPerTurn": max(map(len, turn_appends.values()), default=0),
                        "nativeT": len(joined), "appends": len(block_ids),
                        "savesPerAppend": len(positions) / len(block_ids) if block_ids else None,
                        "drainMs": max(0, result["drained"] - result["seconds"] * 1000)})
    assert complete["cut"] == cut
    for m in metrics:
        if m["cell"].endswith("-loaded"):
            key = m["cell"].removesuffix("-loaded")
            alone = next(x for x in metrics if x["cell"] == key + "-alone")["accountP99Ms"][0]
            loaded = m["accountP99Ms"][0]
            m["quietP99Ratio"] = loaded / alone if loaded is not None and alone else None

    kept = [directory / "header.json", directory / "complete.json", native_path]
    kept.extend(pg_data_evidence)
    kept.extend(directory / (m["cell"] + ".json") for m in metrics)
    if not fixture:
        kept.extend(native_path.parent / f"prep1-gc-{role}.log" for role in roles)
        kept.extend(native_path.parent / f"{role}-native-settings.json" for role in roles)
        if wide:
            kept.extend(directory.parent / name for name in ("seed.json", "SEAL.sha256", "source"))
        elif followup:
            kept.extend(directory.parent / name for name in ("comparison.SEAL.sha256", "SEAL.sha256", "source"))
    return {"fixture": fixture, "source": header["commit"], "nonce": header["nonce"], "slot": header["slot"],
            "seedSha": header["seedSha"], "planSha": sha(plan_path),
            **({"storage": "pg-data", "pgDataCopySha": header["pgDataCopySha"],
                "seedReadbackSha": header["seedReadbackSha"]} if pg_data else {"dumpSha": header["dumpSha"]}),
            "fairCredits": fair_credits, "numericOwner": bool(arm.get("numericOwner")),
            "prefetch": bool(arm.get("prefetch")), "cacheGiB": arm.get("cacheGiB"), "orderedIds": ordered_ids,
            "rawSha256": {path.name: sha(path) for path in kept}, "cells": metrics}


if __name__ == "__main__":
    assert len(sys.argv) in (4, 5) and (len(sys.argv) == 4 or sys.argv[4] == "--fixture")
    json.dump(collect(*(Path(arg) for arg in sys.argv[1:4]), allow_fixture=len(sys.argv) == 5), sys.stdout)
    print()
