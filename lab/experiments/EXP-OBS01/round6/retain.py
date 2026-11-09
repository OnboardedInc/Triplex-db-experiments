#!/usr/bin/env python3
"""Verify complete retained evidence, final source identity and cleanup readbacks."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[4]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def run(argv):
    p=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=60)
    if p.returncode:raise RuntimeError(p.stderr.decode())
    return p.stdout.decode()
def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('host disk below 5 GiB')
    out=Path(sys.argv[1]).resolve();repo=Path(__file__).resolve().parent
    final=json.loads((out/'offline09/RESULT.json').read_bytes())
    if final['status']!='PASS':raise RuntimeError('final offline gate failed')
    for path,pin in final['sourceSha256'].items():
        if sha((ROOT/path).read_bytes())!=pin:raise RuntimeError('final tested source differs: '+path)
    checked=0
    for attempt in sorted(out.glob('offline*')):
        lines=(attempt/'SHA256SUMS').read_text().splitlines();expected=set()
        for line in lines:
            pin,path=line.split('  ',1);target=attempt/path
            if sha(target.read_bytes())!=pin:raise RuntimeError('retained evidence drift: '+str(target))
            expected.add(path);checked+=1
        actual={str(p.relative_to(attempt)) for p in attempt.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
        if actual!=expected:raise RuntimeError('retained file-set differs: '+str(attempt))
    if os.environ.get('DOCKER_HOST')!='unix:///Users/sam/.colima/triplex2/docker.sock':raise RuntimeError('private Docker endpoint required')
    containers=run(['docker','ps','-a','--filter','label=tx2.holder=CX-OBS01-R6','--format','{{.ID}} {{.Names}}']).strip()
    volumes=run(['docker','volume','ls','--filter','label=tx2.holder=CX-OBS01-R6','--format','{{.Name}}']).strip()
    if containers or volumes:raise RuntimeError('owned containers or volumes remain')
    cleanup={'holder':'CX-OBS01-R6','containers':containers.splitlines(),'volumes':volumes.splitlines(),'diskFreeBytes':shutil.disk_usage(ROOT).free,'scope':'private triplex2 Docker; own holder only'}
    (out/'cleanup-inventory.json').write_text(json.dumps(cleanup,sort_keys=True)+'\n')
    baseline='1a7fc86c4ee90f2f255d4767c1ff9fcc55da308a';merged='bfae93482279c507a9df0b8f3e638cf76ed3001c'
    paths={}
    for path,new in final['sourceSha256'].items():
        old=subprocess.run(['git','show',baseline+':'+path],cwd=ROOT,capture_output=True)
        base=subprocess.run(['git','show',merged+':'+path],cwd=ROOT,capture_output=True)
        paths[path]={'preMergeSha256':sha(old.stdout) if old.returncode==0 else None,'mergedSha256':sha(base.stdout) if base.returncode==0 else None,'newSha256':new}
    (out/'source-changes.json').write_text(json.dumps(paths,sort_keys=True)+'\n')
    files=sorted(p for p in out.rglob('*') if p.is_file() and p!=out/'SHA256SUMS')
    manifest=''.join(sha(p.read_bytes())+'  '+str(p.relative_to(out))+'\n' for p in files)
    (out/'SHA256SUMS').write_text(manifest)
    for line in manifest.splitlines():
        pin,path=line.split('  ',1)
        if sha((out/path).read_bytes())!=pin:raise RuntimeError('final readback drift')
    if {str(p.relative_to(out)) for p in out.rglob('*') if p.is_file() and p!=out/'SHA256SUMS'}!={line.split('  ',1)[1] for line in manifest.splitlines()}:raise RuntimeError('final file-set differs')
    (repo/'SHA256SUMS').write_text(manifest)
    result={'claim':'offline gate PASS; VM REFUSED; retention hashes checked, not semantic acceptance','durableRoot':str(out),'files':len(files),'offlineEntriesChecked':checked,'manifestSha256':sha(manifest.encode()),'sourceChanges':str(out/'source-changes.json'),'cleanup':cleanup}
    (repo/'INDEX.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='cleanup'},sort_keys=True))
if __name__=='__main__':main()
