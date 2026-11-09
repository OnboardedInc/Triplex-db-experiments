#!/usr/bin/env python3
"""R9 evidence readback: verifies the retained offline gates against current source, then writes the repo SHA256SUMS/INDEX.json.

Usage: retain.py <durable evidence root> <offline attempt dir name> <probes attempt dir name>
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
ROOT=Path(__file__).resolve().parents[4]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    out=Path(sys.argv[1]).resolve();repo=Path(__file__).resolve().parent
    offline=json.loads((out/sys.argv[2]/'RESULT.json').read_bytes());probes=json.loads((out/sys.argv[3]/'RESULT.json').read_bytes())
    if offline['status']!='PASS':raise RuntimeError('offline gate failed')
    for path,pin in {**offline['sourceSha256'],**probes['sourceSha256']}.items():
        if sha((ROOT/path).read_bytes())!=pin:raise RuntimeError('source drift: '+path)
    if not probes['ok'] or not probes['round8']['ok'] or len(probes['matrix'])!=11:raise RuntimeError('probe receipt incomplete')
    vm=json.loads((out/'vm-w0w3-attempt01/RESULT.json').read_bytes())
    if vm['status']!='NOT-RUN':raise RuntimeError('VM probe receipt unexpected')
    for attempt in sorted(p for p in out.iterdir() if p.is_dir()):
        entries={}
        sums=attempt/'SHA256SUMS'
        if not sums.exists():continue
        for line in sums.read_text().splitlines():
            pin,path=line.split('  ',1);entries[path]=pin
            if sha((attempt/path).read_bytes())!=pin:raise RuntimeError('evidence drift: '+str(attempt/path))
        if set(entries)!={str(p.relative_to(attempt)) for p in attempt.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}:raise RuntimeError('file-set differs: '+attempt.name)
    manifest=''.join(sha(p.read_bytes())+'  '+str(p.relative_to(out))+'\n' for p in sorted(out.rglob('*')) if p.is_file() and p.name!='SHA256SUMS')
    (out/'SHA256SUMS').write_text(manifest);(repo/'SHA256SUMS').write_text(manifest)
    for line in manifest.splitlines():
        pin,path=line.split('  ',1)
        if sha((out/path).read_bytes())!=pin:raise RuntimeError('readback drift')
    index={'claim':'offline gates PASS with synthetic kernel traces; W0-W3 NOT RUN (no bpftrace image in the VM, pull needs approval); live durable/P3 still needs a real W0-W3 and B9','durableRoot':str(out),'files':len(manifest.splitlines()),
        'manifestSha256':sha(manifest.encode()),'offlineAttempt':sys.argv[2],'probesAttempt':sys.argv[3],'vmProbe':vm['status'],'sourceSha256':{**offline['sourceSha256'],**probes['sourceSha256']}}
    (repo/'INDEX.json').write_text(json.dumps(index,indent=2,sort_keys=True)+'\n');print(json.dumps({k:index[k] for k in ('files','manifestSha256','vmProbe')}))
if __name__=='__main__':main()
