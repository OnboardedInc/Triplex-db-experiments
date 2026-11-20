"""Pull sealed activation bundles from BM1 after the separate SCALE1 handback."""

import datetime
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import time

INVENTORY = """
import json,pathlib,re,sys
root=pathlib.Path('/var/tmp/triplex-bm1')
batch,source=sys.argv[1:]
day=root/('day-'+batch)
prefix='tx2-dxt1-bm1-'+batch
expected={prefix+'-setup',prefix+'-day-logs'}
if (day/'logs/source.txt').exists():
    assert (day/'logs/source.txt').read_text().strip()==source
if (day/('checkout/state/evidence/DX-T1/'+prefix+'-seed')).is_dir():expected.add(prefix+'-seed')
if (day/'guarded').is_dir():expected.add(prefix+'-guarded')
for file in (day/'guarded').glob('*-request.json'):
    req=json.loads(file.read_bytes())
    assert req['source']==source and file.name==req['arm']+'-request.json'
    assert re.fullmatch(r'tx2-dxt1-bm1-act[a-f0-9]{9}-activation-a',req['slot'])
    expected.add(req['slot'])
available={}
for tag in expected:
    directory=root/'bundles'/tag
    manifest=directory/'TRANSFER.sha256'
    if not manifest.is_file():continue
    names=[line.split('  ',1)[1] for line in manifest.read_text().splitlines()]
    assert all(re.fullmatch(r'[a-zA-Z0-9_-]+[.][a-zA-Z0-9_.-]+',n) for n in names)
    available[tag]=sum((directory/n).stat().st_size for n in names)
final=prefix+'-day-logs' in available and not (day/'active-item').exists()
print(json.dumps({'terminal':final,'available':available,'expected':sorted(expected)}))
"""


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def main(bench, batch, source, limit):
    assert re.fullmatch(r"ubuntu@[a-zA-Z0-9.:-]+", bench)
    assert re.fullmatch(r"[a-z0-9]{1,12}", batch) and re.fullmatch(r"[0-9a-f]{40}", source)
    root = Path(os.environ.get("TRIPLEX_TRACE_EVIDENCE", str(Path.home() / "Claude/Projects/triplex-db-2/evidence")))
    status = root / "DX-BM1" / ("collection-" + batch + ".json")
    sent = root / "DX-BM1" / ("relay-" + batch + ".sent")
    cutoff = datetime.datetime.strptime(limit, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
    collector = Path(__file__).with_name("collect.sh")
    ssh = ["ssh", "-F", "/dev/null", "-i", os.environ.get("DX_BENCH_KEY", str(Path.home() / ".ssh/triplex_bench_ed25519")),
           "-o", "IdentitiesOnly=yes", "-o", "ForwardAgent=no", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
           "-o", "ConnectTimeout=12", bench, "sudo -n python3 - " + batch + " " + source]
    collected = set()
    def note(state, **extra):
        temp = status.with_suffix(".tmp")
        temp.write_text(json.dumps({"at": stamp(), "batch": batch, "source": source, "state": state,
                                    "collected": sorted(collected), **extra}, indent=2) + "\n")
        temp.replace(status)
        print(stamp(), state, flush=True)
    note("waiting for release")
    while not sent.exists() and time.time() < cutoff:
        time.sleep(min(660, max(0, cutoff - time.time())))
    if not sent.exists():
        note("release deadline reached")
        return 75
    cutoff = sent.stat().st_mtime + 9 * 3600
    while time.time() < cutoff:
        try:
            probe = subprocess.run(ssh, input=INVENTORY, text=True, stdout=subprocess.PIPE, check=True, timeout=45)
            observed = json.loads(probe.stdout)
            for tag, size in sorted(observed["available"].items()):
                if tag in collected:
                    continue
                if shutil.disk_usage(root).free < size + 2 * 1024**3:
                    note("waiting for local evidence space", tag=tag, transferBytes=size)
                    continue
                # [DX-BM1] Why: the Mac owns the only inbound credential and pulls each immutable transfer after the server seals it.
                # Rejected: giving the server a Mac credential or leaving a finished guarded run on rented storage.
                proc = subprocess.Popen(["/bin/bash", str(collector), bench, tag], start_new_session=True,
                                        env={**os.environ, "DX_BM1_COMPACT": "1"})
                try:
                    if proc.wait(timeout=max(1, min(1800, cutoff - time.time()))) == 0:
                        collected.add(tag)
                        note("bundle collected", tag=tag)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid, signal.SIGTERM)
                    try:
                        proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        os.killpg(proc.pid, signal.SIGKILL)
                        proc.wait()
            if observed["terminal"] and set(observed["available"]) <= collected:
                missing = sorted(set(observed["expected"]) - collected)
                note("terminal bundles missing" if missing else "terminal bundles collected",
                     expected=observed["expected"], missing=missing)
                return 1 if missing else 0
        except (subprocess.SubprocessError, ValueError, OSError) as exc:
            note("collection will retry", error=type(exc).__name__)
        time.sleep(min(660, max(0, cutoff - time.time())))
    note("collection deadline reached")
    return 75


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
