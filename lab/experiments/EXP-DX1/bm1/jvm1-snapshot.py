#!/usr/bin/python3
"""Restore the verified JVM1 dump once and clone its cold PostgreSQL bytes for each arm."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

ROOT = Path("/var/tmp/triplex-bm1/day-n20-jvm1")
SOURCE = "46880aa47d7c580c400b457df0c8baf9e971e78a"
REPO = ROOT/"build/repository"
STACK = REPO/"lab/experiments/EXP-DX1/stack"
SEED = ROOT/"seed/seed.json"
DUMP = ROOT/"seed/seed.pgdump"
SNAPSHOT = ROOT/"cold-postgres"
PROOF = ROOT/"cold-postgres.json"
DOCKER = "/usr/bin/docker"
ENV = dict(os.environ, DOCKER_HOST="unix:///var/run/docker.sock")
NEXT = {
    "jvm25": "5a96527807fd646fbc866b33dc72565481c409e0",
    "tail-backlog": "da4c34f48f3749afcacfe45ac51a727ab0a2160a",
}


def output(*args, timeout=60):
    return subprocess.check_output(args, cwd=REPO, env=ENV, text=True, timeout=timeout).strip()


def run(*args, timeout=120, **options):
    subprocess.run(args, cwd=REPO, env=ENV, check=True, timeout=timeout, **options)


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write(file, data):
    with file.open("x") as stream:
        json.dump(data, stream, sort_keys=True, indent=2)
        stream.write("\n")


def files(directory):
    return {p.relative_to(directory).as_posix(): (p.stat().st_size, sha(p))
            for p in sorted(directory.rglob("*")) if p.is_file()}


def mount(slot):
    name = slot+"-pg"
    raw, = json.loads(output(DOCKER, "inspect", name))
    assert raw["Name"] == "/"+name
    bound, = [m for m in raw["Mounts"] if m["Destination"] == "/var/lib/postgresql/data"]
    assert bound["Name"] == name+"-data" and bound["Type"] == "volume" and bound["RW"]
    path = Path(output(DOCKER, "volume", "inspect", "--format", "{{.Mountpoint}}", bound["Name"]))
    assert path == Path(bound["Source"]).resolve()
    assert path == Path("/var/lib/docker/volumes")/bound["Name"]/"_data"
    return path, raw["Id"]


def staged():
    seed = json.loads(SEED.read_bytes())
    assert seed["source"] == SOURCE and seed["facts"] == 16_245_050 and seed["seedCut"] == 8710
    assert json.loads((ROOT/"seed/results/seed/cleanup.json").read_bytes()) == {
        "containers": [], "networks": [], "volumes": []}
    assert DUMP.stat().st_size == seed["dumpBytes"]
    return seed


def provision():
    assert output("git", "rev-parse", "HEAD") == SOURCE
    seed = staged()
    if PROOF.is_file():
        assert json.loads(PROOF.read_bytes())["logicalDumpSha256"] == seed["dumpSha256"]
        return
    assert sha(DUMP) == seed["dumpSha256"]
    attempt = ROOT/"snapshot-provision"
    owner = attempt/"owned-slot"
    if owner.is_file():
        slot = owner.read_text().strip()
        assert re.fullmatch(r"tx2-dxt1-jvm1-[a-f0-9-]{36}",slot)
        assert output(DOCKER,"ps","--format","{{.Names}}") == slot+"-pg"
        assert (attempt/"engines"/slot/"sql/postgres-user.sql.log").is_file()
    else:
        assert not output(DOCKER, "ps", "-q")
        attempt.mkdir()
        slot = "tx2-dxt1-jvm1-"+str(uuid.uuid4())
        owner.write_text(slot+"\n")
        boot = dict(DX_BARE_METAL="1", DX_BARE_METAL_ROOT=str(attempt),
                    DX_STACK_EVIDENCE=str(attempt/"engines"), DX_STACK_WAIT_FOR_TRANSACTOR="1")
        run("env", *(k+"="+v for k,v in boot.items()), "bash", STACK/"up.sh", slot, "--no-publish",
            "--cpus-tx","0","--cpus-pg","1,9,10,11","--cpus-gw-write","2","--cpus-gw-read","4,8",
            "--pg-memory","6g","--tx-memory","6g","--object-cache-max","2560m",
            "--pg-settings","-c shared_buffers=1GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on -c track_io_timing=on",
            timeout=300)
        run(DOCKER,"stop","--time","15",slot+"-gw-w",slot+"-gw-r",slot+"-tx",timeout=75)
    pg = slot+"-pg"
    directory, postgres = mount(slot)
    target = "/tmp/bm1-jvm1-logical.pgdump"
    run(DOCKER,"cp",DUMP,pg+":"+target,timeout=240)
    assert output(DOCKER,"exec",pg,"sha256sum",target,timeout=100).split()[0] == seed["dumpSha256"]
    started = time.monotonic()
    with (attempt/"restore.log").open("xb") as log:
        run(DOCKER,"exec",pg,"pg_restore","--jobs=4","-U","postgres","--clean","--if-exists",
            "--exit-on-error","-d","datomic",target,timeout=1600,stdout=log,stderr=subprocess.STDOUT)
    restore_seconds = time.monotonic()-started
    sql = "SELECT count(*),current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes') FROM datomic_kvs"
    count,*settings = output(DOCKER,"exec",pg,"psql","-XAt","-U","postgres","-d","datomic","-c",sql,timeout=120).split("|")
    assert int(count) > 0 and settings == ["on"]*3
    run(DOCKER,"exec",pg,"rm",target)
    run(DOCKER,"stop","--time","45",pg)
    assert not (directory/"postmaster.pid").exists()
    assert not any(p.is_symlink() for p in directory.rglob("*"))
    assert output(DOCKER,"inspect","--format","{{.State.ExitCode}}",postgres) == "0"
    # [DX-BM1] Why: every arm starts from this byte-identical, shut-down PostgreSQL image.
    # Rejected: running a 22 GB single-threaded logical restore inside each six-minute startup.
    original = files(directory)
    SNAPSHOT.mkdir()
    run("cp","-a",str(directory)+"/.",SNAPSHOT,timeout=420)
    assert files(SNAPSHOT) == original
    write(PROOF, dict(source=SOURCE, logicalDumpSha256=seed["dumpSha256"], seedSha256=sha(SEED),
                      seedCut=seed["seedCut"], facts=seed["facts"], postgres=postgres,
                      physicalRows=int(count), restoreSeconds=restore_seconds, files=original))


def replay(args):
    assert args[:2] == ["exec", "-i"] and args[3:] == ["pg_restore","-U","postgres","--clean","--if-exists","--exit-on-error","-d","datomic"]
    pg = args[2]
    assert re.fullmatch(r"tx2-dxt1-jvm1-[a-f0-9-]{36}-pg",pg)
    night = os.environ.get("BM1_COLD_CAMPAIGN")
    if night:
        campaign = ROOT.parent/("night-n20-"+night)
        assert os.getuid() == 0 and night in NEXT
        repo = campaign/"build/repository"
        assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == NEXT[night]
        assert Path.cwd() == repo and os.environ["DX_JVM1_PG_RESTORE"] == str(DUMP)
        # [DX-BM1] Why: the newer producer checks the bytes piped to its subprocess.
        # Rejected: cloning a verified snapshot while acknowledging a different streamed dump.
        supplied = hashlib.file_digest(sys.stdin.buffer, "sha256").hexdigest()
    else:
        assert output("git", "rev-parse", "HEAD") == SOURCE
        assert os.path.samestat(os.fstat(0),DUMP.stat())
    seed = staged()
    proof = json.loads(PROOF.read_bytes())
    assert proof["source"] == SOURCE and proof["logicalDumpSha256"] == seed["dumpSha256"]
    assert proof["seedSha256"] == sha(SEED) and proof["seedCut"] == seed["seedCut"]
    if night:
        assert supplied == proof["logicalDumpSha256"] == os.environ["DX_JVM1_PG_RESTORE_SHA256"]
    path, container = mount(pg.removesuffix("-pg"))
    run(DOCKER,"stop","--time","45",container)
    original = path.with_name("_data.bm1-init")
    assert path.is_dir() and not original.exists() and not (SNAPSHOT/"postmaster.pid").exists()
    path.rename(original)
    path.mkdir()
    run("cp","-a",str(SNAPSHOT)+"/.",path,timeout=300)
    assert {name: list(meta) for name,meta in files(path).items()} == proof["files"]
    assert not (path/"postmaster.pid").exists()
    run(DOCKER,"start",container)
    until = time.monotonic()+60
    while subprocess.run([DOCKER,"exec",container,"pg_isready","-U","postgres","-h","127.0.0.1"],
                         env=ENV, stdout=subprocess.DEVNULL,check=False,timeout=8).returncode:
        if time.monotonic() >= until:
            raise TimeoutError("Verified PostgreSQL clone did not reopen")
        time.sleep(1)
    destination = campaign/"restore-proofs" if night else ROOT/"retry"
    write(destination/("restore-"+pg+".json"),dict(source=NEXT[night] if night else SOURCE, container=container,
          physicalManifestSha256=sha(PROOF),logicalDumpSha256=seed["dumpSha256"], seedCut=seed["seedCut"]))


if __name__ == "__main__":
    argv = sys.argv[1:]
    if Path(sys.argv[0]).name == "docker":
        if len(argv) >= 4 and argv[:2] == ["exec","-i"] and argv[3] == "pg_restore":
            replay(argv)
        else:
            os.execve(DOCKER,[DOCKER,*argv],ENV)
    else:
        assert argv == ["provision"]
        provision()
