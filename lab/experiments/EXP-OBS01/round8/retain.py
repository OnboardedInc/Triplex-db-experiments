#!/usr/bin/env python3
"""R8 offline evidence readback; no semantic P3 durability grant."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[4]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    out=Path(sys.argv[1]).resolve();repo=Path(__file__).resolve().parent
    final=json.loads((out/'offline02/RESULT.json').read_bytes())
    if final['status']!='PASS':raise RuntimeError('offline failed')
    for path,pin in final['sourceSha256'].items():
        if sha((ROOT/path).read_bytes())!=pin:raise RuntimeError('final source drift')
    probes=json.loads((out/'probes02/RESULT.json').read_bytes())
    if not probes['sourceUnchanged'] or len(probes['checks'])!=9:raise RuntimeError('incomplete reviewer probes')
    expected={'path-replacement':'REFUSED','synchronous-off':'REFUSED','full-control':'ACCEPTED','send-after-publication':'REFUSED','wal-rewrite':'REFUSED','wal-reset':'REFUSED','wal-checksum':'REFUSED','unknown-schema':'REFUSED','checkpoint-rollover':'REFUSED'}
    if {c['name']:c['outcome'] for c in probes['checks']}!=expected:raise RuntimeError('reviewer outcomes differ')
    for path,pin in probes['sourceSha256'].items():
        if sha((ROOT/path).read_bytes())!=pin:raise RuntimeError('probe source drift')
    checked=0
    for attempt in sorted([*out.glob('offline*'),*out.glob('probes*')]):
        entries={}
        for line in (attempt/'SHA256SUMS').read_text().splitlines():
            pin,path=line.split('  ',1);entries[path]=pin
            if sha((attempt/path).read_bytes())!=pin:raise RuntimeError('evidence drift')
            checked+=1
        if set(entries)!={str(p.relative_to(attempt)) for p in attempt.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}:raise RuntimeError('file-set differs')
    original=subprocess.run(['git','show','2f1d1f10:lab/verify/OBS01/probe_round7.py'],cwd=ROOT,capture_output=True,check=True).stdout
    copied=(repo/'reviewer/probe_round7.py').read_bytes()
    if original!=copied:raise RuntimeError('reviewer copy differs')
    (out/'reviewer-probe-original.py').write_bytes(copied)
    changes={}
    for path in ('lab/observer/vm_normalizer.py','lab/observer/vm_watch.py','lab/observer/test_vm.py','lab/observer/run_vm_offline.py'):
        old=subprocess.run(['git','show','c1a14ad5:'+path],cwd=ROOT,capture_output=True,check=True).stdout
        changes[path]={'oldSha256':sha(old),'newSha256':sha((ROOT/path).read_bytes())}
    manifest=''.join(sha(p.read_bytes())+'  '+str(p.relative_to(out))+'\n' for p in sorted(out.rglob('*')) if p.is_file() and p!=out/'SHA256SUMS')
    (out/'SHA256SUMS').write_text(manifest);(repo/'SHA256SUMS').write_text(manifest)
    for line in manifest.splitlines():
        pin,path=line.split('  ',1)
        if sha((out/path).read_bytes())!=pin:raise RuntimeError('readback drift')
    index={'claim':'offline regression gates PASS; live durable/P3 publication REFUSED pending independent sync witness','durableRoot':str(out),'files':len(manifest.splitlines()),'manifestEntriesChecked':checked,'manifestSha256':sha(manifest.encode()),'reviewerOriginalSha256':sha(copied),'changes':changes,'probeOutcomes':expected}
    (repo/'INDEX.json').write_text(json.dumps(index,indent=2,sort_keys=True)+'\n');print(json.dumps(index,sort_keys=True))
if __name__=='__main__':main()
