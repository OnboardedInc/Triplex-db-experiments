"""Build, independently check and seal a quiet INT1 seed on the bench host."""

import datetime as dt
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from producer_readings import digest, get

ROOT = Path("/var/tmp/triplex-bm1/single-n20/thin-fixture")
SOURCE = "0dd4cbb24f10dad80e4263fd0c04159ce512b251"
EXP = Path("lab/experiments/EXP-DX1")
BUILD = ROOT / "build"
REPO = BUILD / "repository"
NODE = BUILD / "tools/bin/node"
STATUS = ROOT.parents[1] / "STATUS"
REQUEST = ROOT / "request.json"
HERE = Path(__file__).resolve().parent
ENV = dict(os.environ, DOCKER_HOST="unix:///var/run/docker.sock", DX_BARE_METAL="1",
           DX_BARE_METAL_ROOT=str(ROOT), DX_STACK_EVIDENCE=str(ROOT / "engines"),
           DX_STACK_WAIT_FOR_TRANSACTOR="1", DX_QUIET_LOGS="1", DX_NATIVE_GATES="0",
           TRIPLEX_DATOMIC_LAYOUT="lean", DX_INT1_COHORT="spread", TRIPLEX_DATOMIC_FAST_PATHS="",
           DX_GW_READ_MEMORY="3g", DX_GW_WRITE_MEMORY="3g", DX_GW_READ_HEAP="2g",
           DX_GW_WRITE_HEAP="2g", TX2_SWEEP_STRICT="1",
           PATH=str(NODE.parent) + ":" + os.environ["PATH"])


def line(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def write(path, value):
    with path.open("x") as stream:
        stream.write(json.dumps(value, indent=2) + "\n")


def status(state, next_item):
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    file = ROOT / ("status-" + uuid.uuid4().hex)
    file.write_text(f"item=thin-fixture state={state} since={now} next={next_item}\n")
    file.replace(STATUS)


def output(*args, timeout=45, cwd=REPO):
    return subprocess.check_output(args, cwd=cwd, env=ENV, text=True, timeout=timeout).strip()


def run(*args, timeout, **kwargs):
    subprocess.run(args, cwd=REPO, env=ENV, timeout=timeout, check=True, **kwargs)


def reconcile(folder, request, access, people):
    result = get(folder / "seed.json")
    scope = "bm1-thin-" + request["nonce"] + "-" + str(people)
    access_sha = digest(access)
    binding = hashlib.sha256(line([SOURCE, request["slot"], scope, people, access_sha]).encode()).hexdigest()
    for k, v in dict(source=SOURCE, slot=request["slot"], scope=scope, nonce=request["nonce"],
                     binding=binding, accessSha256=access_sha, people=people, activeCohort=people//50,
                     facts=people*8).items():
        assert result[k] == v, k
    ledger = folder / "population.sqlite"
    assert all(p.stat().st_mtime >= request["start"] for p in (access, ledger, folder / "seed.json"))
    active = people // 50
    sizes = [48] * (active // 48) + ([active % 48] if active % 48 else [])
    cold = people - active
    sizes += [48] * (cold // 48) + ([cold % 48] if cold % 48 else [])
    expected_cut = len(sizes)
    assert result["cut"] == expected_cut and result["feed"]["count"] == expected_cut
    assert result["feed"]["facts"] == people * 8
    assert all(math.isfinite(result[k]) and result[k] > 0 for k in ("ingestMs", "verifyMs"))
    # [DX-BM1] Why: recount the bound roster and independent feed ledger before reusing the data.
    # Rejected: trusting a narrated seed count or a ready-to-dump flag.
    with sqlite3.connect(ledger.as_uri() + "?mode=ro&immutable=1", uri=True) as db:
        assert db.execute("PRAGMA quick_check").fetchone() == ("ok",)
        assert db.execute("SELECT count(*),min(i),max(i),min(born),max(born),count(dirty) FROM people").fetchone() == (
            people, 0, people-1, 1, expected_cut, 0)
        statements = db.execute(
            "SELECT t.p,s.txid,t.cmd,t.instant,s.changes,s.hash,count(p.i) FROM tx t "
            "JOIN seed_feed s ON t.p=s.p JOIN people p ON p.born=t.p GROUP BY t.p ORDER BY t.p")
        seal = hashlib.sha256()
        for expected, row in enumerate(statements, 1):
            p, tx, cmd, instant, changes, sha, members = row
            assert p == expected and cmd == f"{binding[:18]}-{p}" and tx and re.fullmatch("[0-9a-f]{64}", sha)
            assert members == sizes[p-1] and changes == members*8 and math.isfinite(instant)
            time_value = int(instant) if instant == int(instant) else instant
            seal.update((line([binding, p, tx, cmd, time_value, sha]) + "\n").encode())
        assert db.execute("SELECT count(*) FROM seed_feed").fetchone() == (expected_cut,)
        assert db.execute("SELECT count(*) FROM tx").fetchone() == (expected_cut,)
        assert seal.hexdigest() == result["feed"]["sha256"]
    return {**result, "resultSha256": digest(folder / "seed.json"), "ledgerSha256": digest(ledger)}


def clean():
    if not REQUEST.is_file():
        status("setup-refused", "review")
        return
    request = get(REQUEST)
    slot = request["slot"]
    assert request["source"] == SOURCE and re.fullmatch("tx2-dxbm1-thin-[0-9a-f]{12}", slot)
    assert slot.endswith(request["nonce"])
    with (ROOT / "engine-logs.txt").open("w") as stream:
        try:
            subprocess.run(["bash", EXP / "stack/up.sh", slot, "--logs"], cwd=REPO, env=ENV,
                           stdout=stream, stderr=subprocess.STDOUT, timeout=40)
        except (OSError, subprocess.SubprocessError) as error:
            print(f"Engine log capture: {error!r}", file=stream)
    run("bash", EXP / "stack/down.sh", slot, "--volumes", timeout=120)
    assert not output("bash", EXP / "stack/up.sh", slot, "--inventory")
    assert not output("docker", "ps", "-q")
    write(ROOT / "cleanup.json", {"source": SOURCE, "slot": slot, "nonce": request["nonce"], "remaining": []})
    status("sealed" if (ROOT / "seal.json").is_file() else "incomplete", "review")


def build():
    assert shutil.disk_usage(ROOT).free >= 80*1024**3
    assert (BUILD / "results/bootstrap.exit").read_text().strip() == "0"
    assert output("git", "rev-parse", "HEAD") == SOURCE and not output("git", "status", "--porcelain")
    assert not output("docker", "ps", "-q")
    lock = (ROOT.parents[1] / "night-n19/campaign.lock").open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    forecast = next(row for row in (HERE.parent / "PREDICTIONS.md").read_text().splitlines()
                    if row.startswith("| Thin fixture fallback,"))
    nonce = uuid.uuid4().hex[:12]
    slot = "tx2-dxbm1-thin-" + nonce
    request = dict(source=SOURCE, controller=output("git", "rev-parse", "HEAD", cwd=HERE),
                   start=time.time(), slot=slot, nonce=nonce, prediction=forecast,
                   runnerSha256=digest(__file__), seedScriptSha256=digest(HERE / "int1-seed.mjs"))
    write(REQUEST, request)
    status("native-preflight", "seed-1m")
    run("bash", EXP / "stack/up.sh", slot, "--no-publish", "--cpus-tx", "0", "--cpus-pg", "1",
        "--cpus-gw-write", "2", "--cpus-gw-read", "4,8", "--tx-memory", "5g", "--pg-memory", "2g",
        "--tx-java-opts", "-Xms256m -Xmx3g -XX:+UseG1GC", "--object-cache-max", "1280m", timeout=600)
    engine = ROOT / "engines" / slot / "stack.json"
    stack = get(engine)
    assert stack["prefix"] == slot and len(stack["containers"]) == 4
    assert engine.stat().st_mtime >= request["start"]
    for role, field in (("w", "writeUrl"), ("r", "readUrl")):
        host = output("docker", "inspect", "--format", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
                      slot + "-gw-" + role)
        assert re.fullmatch(r"(?:[0-9]{1,3}\.){3}[0-9]{1,3}", host)
        stack[field] = f"http://{host}:8080"
    access = ROOT / "stack-access.json"
    write(access, {**stack, "engineSha256": digest(engine)})
    ENV.update(DATOMIC_URL=stack["writeUrl"], DATOMIC_READ_URLS=stack["readUrl"],
               TRIPLEX_TRACE_SOURCE=SOURCE, TRIPLEX_TRACE_SLOT=slot, TRIPLEX_TRACE_RUN=slot)
    for name, people, ceiling in (("small", 1000, 600), ("full", 1000000, 7200)):
        if name == "full":
            status("seeding", "seal")
        folder = ROOT / name
        run(NODE, "lab/bin/heavy.mjs", "--label", "DX-BM1", "--", "taskset", "-c", "3", NODE,
            "--no-warnings", "--experimental-transform-types", HERE / "int1-seed.mjs", folder, access,
            SOURCE, nonce, str(people), timeout=ceiling)
        write(folder / "verified.json", reconcile(folder, request, access, people))

    status("sealing", "cleanup")
    pg = output("docker", "inspect", "--format", "{{.Id}}", slot + "-pg")
    assert pg in {c["id"] for c in stack["containers"]}
    dump = ROOT / "seed.pgdump"
    # [DX-BM1] Why: keep the exact initialized PostgreSQL snapshot after the owned engines exit.
    # Rejected: retaining a running transactor or taking a filesystem copy of a live raw volume.
    with (ROOT / "seed.pgdump.incomplete").open("xb") as stream:
        run("docker", "exec", pg, "pg_dump", "-U", "postgres", "-Fc", "-Z1", "-d", "datomic",
            timeout=1200, stdout=stream)
    with (ROOT / "seed.pgdump.incomplete").open("rb") as stream, (ROOT / "dump-toc.txt").open("x") as toc:
        run("docker", "exec", "-i", pg, "pg_restore", "--list", timeout=480, stdin=stream, stdout=toc)
    assert "TABLE DATA public kvs " in (ROOT / "dump-toc.txt").read_text()
    (ROOT / "seed.pgdump.incomplete").rename(dump)
    write(ROOT / "seal.json", {"source": SOURCE, "slot": slot, "nonce": nonce, "requestSha256": digest(REQUEST),
          "snapshot": {"bytes": dump.stat().st_size, "sha256": digest(dump)}, "postgresId": pg,
          "smallSha256": digest(ROOT / "small/verified.json"), "fullSha256": digest(ROOT / "full/verified.json")})
    lock.close()


if __name__ == "__main__":
    assert sys.platform == "linux" and os.getuid() == 0 and len(sys.argv) == 2
    assert sys.argv[1] in ("run", "cleanup")
    (build if sys.argv[1] == "run" else clean)()
