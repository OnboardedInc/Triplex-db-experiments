#!/usr/bin/env python3
"""Retain offline R7 evidence with exact source and complete file-set verification."""
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
    out=Path(sys.argv[1]).resolve();gate=out/'offline01';repo=Path(__file__).resolve().parent
    result=json.loads((gate/'RESULT.json').read_bytes())
    if result['status']!='PASS':raise RuntimeError('offline failed')
    for path,pin in result['sourceSha256'].items():
        if sha((ROOT/path).read_bytes())!=pin:raise RuntimeError('tested source differs')
    entries={}
    for line in (gate/'SHA256SUMS').read_text().splitlines():
        pin,path=line.split('  ',1);entries[path]=pin
        if sha((gate/path).read_bytes())!=pin:raise RuntimeError('evidence drift')
    if set(entries)!={str(p.relative_to(gate)) for p in gate.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}:raise RuntimeError('file-set differs')
    changes={}
    for path in ('lab/observer/vm_normalizer.py','lab/observer/test_vm.py'):
        old=subprocess.run(['git','show','08781c28:'+path],cwd=ROOT,capture_output=True,check=True).stdout
        changes[path]={'oldSha256':sha(old),'newSha256':result['sourceSha256'][path]}
    ruling=Path('/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS-PENDING.md').read_bytes()
    row=next(line for line in ruling.decode().splitlines() if line.startswith('| Q100s '))
    (out/'Q100s.txt').write_text(row+'\n')
    r6=out.parent/'OBS01-round6/SHA256SUMS'
    if sha(r6.read_bytes())!='6685cd0f0c05aa460a2ac929653df9d6b565462d96b876a2fabe9dde45c2edb9':raise RuntimeError('round 6 manifest changed')
    manifest=''.join(sha(p.read_bytes())+'  '+str(p.relative_to(out))+'\n' for p in sorted(out.rglob('*')) if p.is_file() and p!=out/'SHA256SUMS')
    (out/'SHA256SUMS').write_text(manifest);(repo/'SHA256SUMS').write_text(manifest)
    for line in manifest.splitlines():
        pin,path=line.split('  ',1)
        if sha((out/path).read_bytes())!=pin:raise RuntimeError('readback drift')
    index={'claim':'offline gate PASS only; no VM measurement or NS semantic verdict','durableRoot':str(out),'files':len(manifest.splitlines()),'manifestSha256':sha(manifest.encode()),'changes':changes,'rulingSourceSha256':sha(ruling),'round6ManifestSha256':sha(r6.read_bytes())}
    (repo/'INDEX.json').write_text(json.dumps(index,indent=2,sort_keys=True)+'\n');print(json.dumps(index,sort_keys=True))
if __name__=='__main__':main()
