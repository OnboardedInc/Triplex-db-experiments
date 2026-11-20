"""Run supplemental work in the gap after W1 has finished pricing and verified its seed."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
NIGHT = Path("/var/tmp/triplex-bm1/night-n19")


def get(p):
    return json.loads(p.read_bytes())


def sha(p):
    with p.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def controller(pid, batch, root, source):
    proc = Path("/proc") / str(pid)
    argv = (proc / "cmdline").read_bytes().decode().split("\0")
    return ("triplex-w1-" + batch + ".service" in (proc / "cgroup").read_text()
            and argv[0].rsplit("/", 1)[-1] == "node"
            and any(a.endswith("w1/group/server.ts") for a in argv)
            and argv[-5:-1] == ["run", str(root), source, batch])


def start_ticks(pid):
    return (Path("/proc") / str(pid) / "stat").read_text().rsplit(")", 1)[-1].split()[19]


def resume(directory, batch, root, source):
    marker = directory / "paused.json"
    if not marker.exists():
        return
    state = get(marker)
    try:
        fd = os.pidfd_open(state["pid"])
        try:
            if (start_ticks(state["pid"]) == state["startTicks"]
                    and controller(state["pid"], batch, root, source)):
                signal.pidfd_send_signal(fd, signal.SIGCONT)
        finally:
            os.close(fd)
    except (FileNotFoundError, ProcessLookupError):
        pass
    marker.rename(directory / "resumed.json")


def capture_checkpoint(arm, directory, identity, recorded, seed, deadline):
    # [DX-BM1] Why: the post-pricing source is quiescent after W1 verifies its original seed. Save it once so the two diagnostics can start from identical bytes.
    # Rejected: rebuilding 16 million facts or treating a live volume file copy as a recoverable PostgreSQL database.
    checkpoint = NIGHT / "checkpoints" / (directory.name + "-before-probes")
    checkpoint.mkdir(parents=True, exist_ok=False)
    role=identity["slot"]+"-pg"
    snapshot=json.loads(subprocess.check_output(["docker","inspect",role]))[0]
    assert snapshot["Name"]=="/"+role and snapshot["State"]["Running"]
    assert any(v.get("Name")==identity["slot"]+"-pg-data" for v in snapshot["Mounts"])
    ident=snapshot["Id"]; owned=recorded["phases"][-1]["lastPosition"]
    partial=checkpoint/"host.pgdump.partial"
    with partial.open("xb") as f:
        subprocess.run(["docker","exec",ident,"pg_dump","-U","postgres","-Fc","-Z1","-d","datomic"],stdout=f,
                       timeout=min(350,max(1,int(deadline-time.time()-600))),check=True)
    with partial.open("rb") as source:
        assert source.read(5)==b"PGDMP";source.seek(0)
        toc=subprocess.run(["docker","exec","-i",ident,"pg_restore","--list"],stdin=source,
                           stdout=subprocess.PIPE,timeout=60,check=True).stdout
    assert b"datomic_kvs" in toc and partial.stat().st_size>0
    assert json.loads(subprocess.check_output(["docker","inspect",role]))[0]["Id"]==ident
    (checkpoint/"toc.txt").write_bytes(toc)
    digest=sha(partial)
    partial.rename(checkpoint/"host.pgdump")
    proof={"source":identity["source"],"slot":identity["slot"],"nonce":identity["nonce"],"original":str(arm),
           "scope":recorded["scope"],"db":recorded["db"],"lastPosition":owned,"seed":seed,
           "witness":recorded["phases"][-1]["records"][-1],"bindingSha256":sha(directory/"bound-seed.json"),
           "pgContainer":ident,"bytes":(checkpoint/"host.pgdump").stat().st_size,"dumpSha256":digest,"at":time.time()}
    (checkpoint/"checkpoint.json").write_text(json.dumps(proof,indent=2)+"\n")
    (directory/"checkpoint.json").write_text(json.dumps(proof,indent=2)+"\n")


def main():
    mode, batch, ordinal, operator = sys.argv[1:]
    assert re.fullmatch(r"grpw1[ab]", batch) and ordinal in ("1", "2")
    assert re.fullmatch(r"[0-9a-f]{40}", operator)
    root = Path("/var/tmp/triplex-w1") / batch
    source = (root / "source").read_text().strip()
    arm = root / "results" / ("arm-" + ordinal)
    directory = NIGHT / "probes" / (batch + "-" + ordinal)
    if mode == "resume":
        resume(directory, batch, root, source)
        return
    assert mode == "wait" and os.getuid() == 0
    directory.mkdir(parents=True, exist_ok=False)
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=HERE, text=True).strip() == operator
    repo = root / "build/repository"
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == source
    raw = arm / "raw.json"
    deadline = float(os.environ["BM1_PROBE_DEADLINE"])
    print("Waiting for the completed W1 traffic file", raw, flush=True)
    while time.time() < deadline:
        if raw.is_file():
            try:
                recorded = get(raw)
                break
            except json.JSONDecodeError:
                pass
        if (root / "terminal").exists():
            raise RuntimeError("W1 finished before this seed became available")
        time.sleep(2)
    else:
        raise TimeoutError("W1 deadline before completed traffic")
    identity = get(arm / "identity.json")
    slot = "tx2-dxscale1-w1-" + batch + "-" + ordinal
    assert identity["slot"] == slot and identity["source"] == source
    assert recorded["nonce"] == identity["nonce"] and recorded["grouped"] == (ordinal == "2")
    assert [p["name"] for p in recorded["phases"]] == ["alone", "one", "nine", "all"]
    assert all(len(p["records"]) == p["count"] and p["wall"] >= 59900 for p in recorded["phases"])
    assert (root / "active-slot").read_text().strip() == slot
    group = Path("/sys/fs/cgroup/system.slice/triplex-w1-" + batch + ".service/cgroup.procs")
    matches = []
    for candidate in group.read_text().split():
        try:
            if controller(int(candidate), batch, root, source):
                matches.append(int(candidate))
        except (FileNotFoundError, ProcessLookupError):
            pass
    assert len(matches) == 1, "Cannot identify the exact native W1 controller"
    pid = matches[0]
    fd = os.pidfd_open(pid)
    try:
        # [DX-BM1] Why: the measured worker has flushed all four phases. Keep only its waiting parent parked while the worker independently verifies all seed rows.
        # Rejected: delaying timed offers, redirecting Docker commands, or relying on a shell trap to resume a recycled PID.
        state = {"pid": pid, "startTicks": start_ticks(pid), "source": source, "slot": slot,
                 "nonce": identity["nonce"], "rawSha256": sha(raw), "at": time.time()}
        assert controller(pid, batch, root, source)
        with (directory / "paused.json").open("x") as f:
            json.dump(state, f)
        signal.pidfd_send_signal(fd, signal.SIGSTOP)
        try:
            seed = arm / "seed-readback.json"
            while not seed.is_file() and time.time() < deadline:
                worker_live = False
                for candidate in group.read_text().split():
                    try:
                        args = (Path("/proc") / candidate / "cmdline").read_bytes().decode().split("\0")
                        worker_live |= ("worker" in args and str(arm) in args and any(a.endswith("group/server.ts") for a in args))
                    except FileNotFoundError:
                        pass
                if not worker_live and not seed.exists():
                    raise RuntimeError("W1 worker exited during seed readback")
                time.sleep(1)
            proof = get(seed)
            assert proof["facts"] == 16245050 and proof["digest"] == "2720380f5b5e6f31fd632380e6ef6d16acc4d646735962d2cb908e0ab40e1146"
            assert proof["seedCut"] == proof["seedCommits"] == recorded["phases"][0]["firstPosition"] - 1
            assert len(recorded["seeds"]) == 10 and all(a["subjects"] == 10000 for a in recorded["seeds"])
            with (directory / "bound-seed.json").open("x") as f:
                json.dump({**state, "operator": operator, "seedSha256": sha(seed), "seed": proof, "db": recorded["db"],
                           "scope": recorded["scope"], "grouped": recorded["grouped"], "atVerified": time.time()}, f)
            if ordinal=="1" and time.time()+600<deadline:
                try:
                    capture_checkpoint(arm,directory,identity,recorded,proof,deadline)
                except Exception as error:
                    (directory/"checkpoint-error.txt").write_text(repr(error)+"\n")
            available = min(1100, int(deadline - time.time()) - 75)
            if available < 75:
                raise TimeoutError("Reserved cleanup time reached")
            node = str(root / "build/tools/bin/node")
            child = [node, "lab/bin/heavy.mjs", "--label", "DX-BM1-verified-seed-probes", "--", "taskset", "-c", "3,5,6,7,9,10,11",
                     node, "--import", "tsx", str(HERE / "group-probes.mjs"), str(arm), str(directory), str(available)]
            subprocess.run(child, check=True, timeout=available, cwd=repo,
                           env=dict(os.environ, PATH=str(root / "build/tools/bin") + ":" + os.environ["PATH"],
                                    DOCKER_HOST="unix:///var/run/docker.sock"))
        finally:
            signal.pidfd_send_signal(fd, signal.SIGCONT)
            resume(directory, batch, root, source)
    finally:
        os.close(fd)


if __name__ == "__main__":
    main()
