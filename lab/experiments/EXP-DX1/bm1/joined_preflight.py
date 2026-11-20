"""Run and collect the published joined Publish smoke on one owned Linux stack."""

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from producer_readings import digest, get


EXP = Path("lab/experiments/EXP-DX1")
CELLS = [("owed", 0), ("staged", 0), ("owed", 3.5), ("staged", 3.5), ("owed", 23.5), ("staged", 23.5)]


def point_readback(folder, repo, reading):
    node = repo.parent / "tools/bin/node"
    raw = subprocess.check_output([node, "--experimental-strip-types", Path(__file__).with_name("joined_readback.mjs"), folder],
                                  cwd=repo, text=True, timeout=120)
    result = json.loads(raw)
    assert [result[k] for k in ("source", "nonce", "slot")] == [reading[k] for k in ("source", "nonce", "slot")]
    assert result["saves"] == sum(w["saves"] for w in reading["windows"]) and len(result["responses"]) == 12
    return result


def joined_output(folder, owner, source, start, repo=None):
    # [DX-BM1] Why: require all six real cells and replay their offer, clock and native proof identities.
    # Rejected: granting a 100k or deadline result from the small smoke or from the aggregate file alone.
    input_file = folder / "server-inputs.json"
    inputs, reading, native = get(input_file), get(folder / "server-observations.json"), get(owner)
    nonce = inputs["nonce"]
    assert uuid.UUID(nonce).hex == nonce.replace("-", "")
    assert inputs["source"] == reading["source"] == source and inputs["nonce"] == reading["nonce"]
    assert inputs["n"] == reading["n"] == 64 and inputs["smoke"] is True
    assert reading["scope"] == "lazy-join-server-" + nonce
    assert (inputs["slot"], inputs["volume"], inputs["owner"]) == (native["container"], native["volume"], digest(owner))
    assert reading["inputs"] == digest(input_file) and reading["owner"] == inputs["owner"]
    if repo is not None:
        assert native["source"] == source and native["mode"] == "exclusive"
        assert digest(repo / "lab/config/slots.json") == inputs["config"]
        for name, expected in (inputs["pins"] | inputs["build"]).items():
            file = (repo / name).resolve()
            assert file.is_relative_to(repo.resolve()) and digest(file) == expected
    expected_names = {"server-effects"} | {f"{f}-{i}" for i in range(6) for f in ("offer", "window", "proof")}
    assert set(reading["outputs"]) == expected_names
    for name in expected_names | {"server-inputs", "server-observations"}:
        assert (folder / (name + ".json")).stat().st_mtime >= start - 2
        if name in reading["outputs"]:
            assert digest(folder / (name + ".json")) == reading["outputs"][name]
    windows, subjects, releases = [], set(), set()
    positions, bodies = set(), set()
    for i, (mode, rate) in enumerate(CELLS):
        offer, window, proof = (get(folder / f"{kind}-{i}.json") for kind in ("offer", "window", "proof"))
        first, deadline = window["first"], window["deadline"]
        assert [offer[k] for k in ("index", "mode", "rate", "nonce", "request")] == [i, mode, rate, nonce, f"publish-{i}"]
        assert [window[k] for k in ("index", "mode", "rate", "doc", "offered", "ingress")] == [i, mode, rate, offer["document"], offer["offered"], offer["ingress"]]
        assert window["request"] == "joined:" + offer["request"]
        assert offer["cutoff"] == offer["offered"] + 1000
        assert window["ingress"] <= window["entered"] <= window["durable"] <= first["started"] <= first["finished"]
        assert deadline["started"] >= offer["cutoff"] - 2 and deadline["finished"] >= deadline["started"]
        assert deadline["subject"] == first["subject"] and first["basis"]["tx"] >= window["nativeCut"]
        shown = deadline["basis"]["tx"] >= window["nativeCut"]
        assert deadline["onRelease"] is shown
        miss = max(window["durable"], first["finished"]) > offer["cutoff"] or not shown
        assert window["deadlineMiss"] is miss
        assert reading["windows"][i] == dict(index=i, mode=mode, rate=rate, deadlineMiss=miss)
        durable = window["durable"] - offer["offered"]
        assert window["offeredToDurableMs"] == window["noticeRecipeDurableMs"] == durable
        assert window["firstCorrectMs"] == first["finished"] - offer["offered"]
        assert window["changedValuesDurableMs"] == (durable if mode == "staged" else None)
        assert window["individualOwedDurableMs"] is None
        assert window["roster"] == reading["roster"]
        assert (proof["nonce"], proof["release"], proof["tx"], proof["cut"], proof["count"]) == (nonce, window["release"], window["nativeTx"], window["nativeCut"], 64)
        assert proof["changes"] > 0 and proof["notices"] > 0 and proof["owed"] >= proof["notices"]
        assert re.fullmatch("[a-f0-9]{64}", proof["digest"])
        writes = window["writes"]
        assert len(writes) == {0: 0, 3.5: 2, 23.5: 12}[rate]
        assert all(w["entered"] <= w["done"] and w["p"] > window["baseline"] for w in writes)
        assert all(a["p"] < b["p"] for a, b in zip(writes, writes[1:]))
        bodies.add(json.dumps(offer["document"], sort_keys=True))
        releases.add(window["release"])
        subjects.add(first["subject"])
        positions.add(window["nativeCut"])
        windows.append(dict(index=i, mode=mode, rate=rate, saves=len(writes), durableMs=durable,
                            firstCorrectMs=window["firstCorrectMs"], ingressDeltaMs=window["ingress"]-window["offered"],
                            earlySaves=sum(w["entered"]<w["offered"] for w in writes),
                            minSaveEntryDeltaMs=min((w["entered"]-w["offered"] for w in writes),default=None),
                            deadlineMiss=miss, notices=proof["notices"]))
    assert len(reading["windows"]) == len(bodies) == len(releases) == len(subjects) == len(positions) == 6
    effects = get(folder / "server-effects.json")
    assert effects["effects"] >= sum(w["notices"] for w in windows) and re.fullmatch("[a-f0-9]{64}", effects["hash"])
    return {"source": source, "nonce": nonce, "slot": inputs["slot"], "subjects": 64, "windows": windows,
            "effects": effects["effects"], "inputSha256": digest(input_file),
            "observationSha256": digest(folder / "server-observations.json")}


def host(r, request, clean=False):
    root = Path(r["root"])
    tag, source = r["tag"], r["source"]
    assert r["item"] == 14 and re.fullmatch(r"joinedn19b?", tag) and root == Path("/var/tmp/triplex-bm1/night-n19") / tag
    repo = root / "build/repository"
    marker = root / "stack-owner.json"
    prefix = "tx2-dxt1-bm1-" + tag
    env = dict(os.environ, DOCKER_HOST="unix:///var/run/docker.sock", DX_BARE_METAL="1",
               DX_BARE_METAL_ROOT=str(root), DX_STACK_EVIDENCE=str(root / "engines"), DX_STACK_WAIT_FOR_TRANSACTOR="1",
               TRIPLEX_TRACE_SOURCE=source, TRIPLEX_TRACE_SLOT=prefix, TRIPLEX_TRACE_RUN=prefix,
               TRIPLEX_TRACE_LEVEL="off", TRIPLEX_DATOMIC_LAYOUT="lean", DX_QUIET_LOGS="1",
               DX_GW_WRITE_MEMORY="5g", DX_GW_READ_MEMORY="5g", DX_GW_WRITE_JAVA_OPTS="-Xms256m -Xmx4g",
               DX_GW_READ_JAVA_OPTS="-Xms256m -Xmx4g", TX2_SWEEP_STRICT="1", TX2_W0_POINT_JOURNAL="1",
               TX2_W0_RESTORE_INDEXED_JOURNAL="1")

    def command(*args, timeout=30):
        return subprocess.check_output(list(map(str, args)), cwd=repo, env=env, text=True, timeout=timeout).strip()

    def run(*args, timeout):
        subprocess.run(list(map(str, args)), cwd=repo, env=env, timeout=timeout, check=True)

    bound = dict(source=source, prefix=prefix, requestSha256=digest(request))
    if clean:
        if not marker.is_file():
            return
        assert get(marker) == bound
        assert command("git", "rev-parse", "HEAD") == source
        log = root / "startup-and-engine.log"
        if not log.exists():
            with log.open("w") as stream:
                subprocess.run(["bash", str(EXP / "stack/up.sh"), prefix, "--logs"], cwd=repo, env=env,
                               stdout=stream, stderr=subprocess.STDOUT, timeout=40)
        run("bash", EXP / "stack/down.sh", prefix, "--volumes", timeout=120)
        assert not command("bash", EXP / "stack/up.sh", prefix, "--inventory")
        (root / "native-clean.json").write_text(json.dumps({**bound, "remaining": []}) + "\n")
        marker.unlink()
        return

    assert command("git", "rev-parse", "HEAD") == source and not command("git", "status", "--porcelain")
    assert not command("docker", "ps", "-q") and not command("bash", EXP / "stack/up.sh", prefix, "--inventory")
    with marker.open("x") as stream:
        json.dump(bound, stream)
    run("bash", EXP / "stack/up.sh", prefix, "--no-publish", "--cpus-tx", "0", "--cpus-pg", "1", "--cpus-gw-write", "2", "--cpus-gw-read", "4",
        "--pg-memory", "6g", "--tx-memory", "8g", "--tx-java-opts", "-Xms256m -Xmx6g -XX:+UseG1GC", timeout=420)
    roles = ("pg", "tx", "gw-w", "gw-r")
    peers = json.loads(command("docker", "inspect", *(prefix + "-" + r for r in roles)))
    assert len(peers) == len({a["Id"] for a in peers}) == 4
    assert all(a["Name"] == "/" + prefix + "-" + r and a["State"]["Running"] for r, a in zip(roles, peers))
    volume = prefix + "-pg-data"
    assert any(x.get("Name") == volume for x in peers[0]["Mounts"])
    addresses = [v["NetworkSettings"]["Networks"][prefix + "-net"]["IPAddress"] for v in peers[2:]]
    assert all(re.fullmatch(r"(?:\d+\.){3}\d+", ip) for ip in addresses)
    assert command("docker", "exec", prefix + "-pg", "psql", "-U", "postgres", "-Atc",
                   "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')") == "on|on|on"
    write_url, read_url = (f"http://{ip}:8080" for ip in addresses)
    owner = root / "run-owner.json"
    with owner.open("x") as stream:
        json.dump({**bound, "mode": "exclusive", "container": prefix + "-gw-w", "volume": volume, "endpoint": write_url,
                   "roles": {r: a["Id"] for r, a in zip(roles, peers)}}, stream)
    env.update(TRIPLEX_LAB_SLOT_OWNER=str(owner), DATOMIC_URL=write_url, DATOMIC_READ_URLS=read_url, TX2_CONFIG_DIR=str(repo))
    output = root / "smoke"
    output.mkdir()
    node = root / "build/tools/bin/node"
    timeout = min(720, max(1, int(r["deadline"] - time.time() - 120)))
    run(node, "lab/bin/heavy.mjs", "--label", "DX-BM1", "--", "taskset", "-c", "3,5,6,7,9,10,11", node,
        "--experimental-strip-types", EXP / "actv-lazy/join/server.ts", "64", output, "--local", timeout=timeout)
    result = joined_output(output, owner, source, r["start"], repo)
    (root / "point-check.json").write_text(json.dumps(point_readback(output, repo, result), indent=2) + "\n")
    (root / "collector.json").write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    request = Path(sys.argv[2])
    assert os.getuid() == 0 and sys.platform == "linux" and sys.argv[1] in {"run", "cleanup"}
    host(get(request), request, clean=sys.argv[1] == "cleanup")
