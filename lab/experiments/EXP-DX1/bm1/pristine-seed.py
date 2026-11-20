"""Seal a stopped, freshly verified W0 seed and restore private activation clones."""

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path("/var/tmp/triplex-bm1")
CUT = 4338757
WORLDS = "sha256:fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760"


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load(path):
    return json.loads(path.read_bytes())


def write(path, value):
    with path.open("x") as f:
        json.dump(value, f, indent=2)
        f.write("\n")


def seed_proof(run, slot, source):
    attempt = load(run / "activation-attempt.json")
    assert run.name == attempt["slot"] == attempt["run"] == slot
    assert attempt["source"] == (run / "head.txt").read_text().strip() == source
    assert attempt["scope"] == "dxt1-w0-100000-" + slot and attempt["subjects"] == 100000
    assert re.fullmatch(r"[a-f0-9-]{36}", attempt["nonce"])
    assert sha(run / "source.SHA256SUMS") == attempt["sourceManifestSha256"]
    def last(path):
        with path.open() as f:
            for line in f:
                pass
        return json.loads(line)
    seeded, verified = [last(run / f) for f in ("driver.log", "seed-readback.log")]
    with (run / "driver.log").open() as f:
        resume = next(json.loads(l) for l in f if l.startswith('{"event":"resume",'))
    assert resume["scope"] == attempt["scope"] and resume["N"] == 100000
    assert resume["checkpoint"] == resume["head"] == resume["recovered"] == 0
    assert seeded["event"] == "chunk-seeded" and seeded["throughPosition"] == CUT
    assert verified["event"] == "chunk-readback" and verified["scope"] == attempt["scope"]
    assert seeded["endSubjects"] == verified["endSubjects"] == verified["N"] == 100000
    assert verified["counts"]["position"] == verified["fingerprint"]["basisTx"] == CUT
    assert verified["fingerprint"]["worlds"] == verified["expected"] == WORLDS
    return {"source": source, "slot": slot, "nonce": attempt["nonce"], "scope": attempt["scope"],
            "position": CUT, "subjects": 100000, "worlds": WORLDS, "inputs": {
                name: sha(run / name) for name in ("activation-attempt.json", "source.SHA256SUMS", "driver.log", "seed-readback.log")}}


def docker(*args, capture=False):
    return subprocess.run(["docker", *args], check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def copy_pg(slot, source_mount, target_mount, ledger_mount, *, seal):
    # [DX-BM1] Why: a cold filesystem copy preserves the exact transaction history and head in all three arms.
    # Rejected: a historical as-of read on a database whose writable head has already processed live traffic.
    script = r"""
set -eu
test "$(cat /from/PG_VERSION)" = 17
test ! -e /from/postmaster.pid
pg_controldata /from | grep -Eq '^Database cluster state:[[:space:]]+shut down$'
test -z "$(find /from -type l -print -quit)"
test -z "$(ls -A /to)"
cp -a /from/. /to/
if [ "$1" = seal ]; then
  (cd /from && find . -type f -exec sha256sum {} +) > /tmp/files
  LC_ALL=C sort /tmp/files > /ledger/PG.SHA256SUMS
fi
(cd /to && find . -type f -exec sha256sum {} +) > /tmp/files
LC_ALL=C sort /tmp/files > /tmp/copied
cmp /ledger/PG.SHA256SUMS /tmp/copied
sync
"""
    docker("run", "--rm", "--pull", "never", "--name", slot + "-seed-copy", "--read-only",
           "--network", "none", "--memory", "256m", "--memory-swap", "256m", "--tmpfs", "/tmp:size=64m",
           "--mount", source_mount + ",dst=/from,readonly", "--mount", target_mount + ",dst=/to",
           "--mount", ledger_mount + ",dst=/ledger" + ("" if seal else ",readonly"),
           "--entrypoint", "/bin/sh", "postgres:17-alpine", "-ec", script, "sh", "seal" if seal else "clone")


def main(mode, batch, slot, output):
    assert mode in ("seal", "clone") and re.fullmatch(r"[a-z0-9]{1,12}", batch)
    assert sys.platform == "linux" and os.getuid() == 0 and os.environ["DX_BARE_METAL"] == "1"
    assert os.environ["DOCKER_HOST"] == "unix:///var/run/docker.sock"
    state = Path(os.environ["DX_LAB_ROOT"]).resolve()
    run = state / "evidence/DX-T1" / slot
    assert Path(output).resolve() == run
    owner = load(state / "locks/measure/owner.json")
    assert (owner["id"], owner["kind"], owner["prefix"]) == ("DX-T1", "activation", slot)
    os.kill(owner["pid"], 0)
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    day = ROOT / ("day-" + batch)
    seed_slot = "tx2-dxt1-bm1-" + batch + "-seed"
    original = day / "checkout/state/evidence/DX-T1" / seed_slot
    proof = seed_proof(original, seed_slot, source)
    sealed = day / "pristine"
    volume = slot + "-pg-data"
    if mode == "seal":
        assert slot == seed_slot and run == original and not sealed.exists()
        staging = day / "pristine.in-progress"
        staging.mkdir(mode=0o700)
        (staging / "data").mkdir()
        pg = json.loads(docker("inspect", slot + "-pg", capture=True))[0]
        assert pg["State"]["Running"] and pg["Name"] == "/" + slot + "-pg"
        assert any(m["Destination"] == "/var/lib/postgresql/data" and m.get("Name") == volume for m in pg["Mounts"])
        docker("stop", "-t", "60", slot + "-gw-r", slot + "-gw-w", slot + "-tx")
        docker("stop", "-t", "60", slot + "-pg")
        assert not docker("ps", "-q", "--filter", "volume=" + volume, capture=True).strip()
        copy_pg(slot, "type=volume,src=" + volume, "type=bind,src=" + str(staging / "data"),
                "type=bind,src=" + str(staging), seal=True)
        proof["pgFilesSha256"] = sha(staging / "PG.SHA256SUMS")
        write(staging / "seed.json", proof)
        staging.rename(sealed)
        write(run / "pristine-seed.json", proof)
    else:
        assert re.fullmatch(r"tx2-dxt1-bm1-act[a-f0-9]{9}-activation-a", slot)
        attempt = load(run / "activation-attempt.json")
        assert attempt["run"] == attempt["slot"] == slot and attempt["source"] == source
        assert attempt["scope"] == proof["scope"] and attempt["sealedCut"] == CUT
        proof["pgFilesSha256"] = sha(sealed / "PG.SHA256SUMS")
        assert proof == load(sealed / "seed.json") == load(original / "pristine-seed.json")
        assert not docker("volume", "ls", "--format", "{{.Name}}", "--filter", "name=^" + volume + "$", capture=True).strip()
        docker("volume", "create", "--label", "triplex.owner=" + slot, volume)
        copy_pg(slot, "type=bind,src=" + str(sealed / "data"), "type=volume,src=" + volume,
                "type=bind,src=" + str(sealed), seal=False)
        write(run / "seed-origin.json", {**proof, "seedSha256": sha(sealed / "seed.json"),
                                         "cloneSlot": slot, "cloneNonce": attempt["nonce"]})


if __name__ == "__main__":
    main(*sys.argv[1:])
