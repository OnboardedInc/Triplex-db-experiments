#!/usr/bin/env python3
"""Frozen offline qualification; bulky raw outputs remain in evaluator evidence storage."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent

def sha(raw): return hashlib.sha256(raw).hexdigest()

def main():
    if shutil.disk_usage(ROOT).free < 5 * 1024 ** 3: raise RuntimeError('below 5 GiB disk floor; no run started')
    out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
    sources={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in str(p)}
    for rel in sources:
        path=out/'source'/rel;path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/rel,path)
    result={'format':'er01-s-round2-gates/1','startedUnixMs':time.time_ns()//1000000,'sourceSha256':sources,
            'claim':'offline fixture and retained-QA replays only; no live erasure acceptance','status':'FAILED'}
    try:
        for name in ('test_formats.py','test_scanners.py'):
            process=subprocess.run([sys.executable,'-B',str(ROOT/name)],capture_output=True,timeout=1200)
            (out/(name+'.stdout')).write_bytes(process.stdout);(out/(name+'.stderr')).write_bytes(process.stderr)
            print(name+': '+str(process.returncode),flush=True)
            if process.returncode: raise RuntimeError(name+' failed; retained log')
        process=subprocess.run([sys.executable,'-B',str(ROOT/'replay_qa_round2.py'),str(out/'qa-31')],capture_output=True,timeout=1800)
        (out/'qa.stdout').write_bytes(process.stdout);(out/'qa.stderr').write_bytes(process.stderr)
        print(process.stdout.decode(),flush=True)
        if process.returncode: raise RuntimeError('31-scenario QA replay failed; retained log')
        for rel,pin in sources.items():
            if sha((ROOT/rel).read_bytes())!=pin:raise RuntimeError('source drift; no PASS: '+rel)
        result.update(status='PASS',unitSuites=['test_formats.py','test_scanners.py'],qaScenarioCount=31)
    finally:
        result['finishedUnixMs']=time.time_ns()//1000000
        (out/'RESULT.json').write_text(json.dumps(result,sort_keys=True)+'\n')
        lines=[]
        for p in sorted(out.rglob('*')):
            if p.is_file():lines.append(sha(p.read_bytes())+'  '+str(p.relative_to(out)))
        (out/'SHA256SUMS').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'output':str(out),'status':result['status'],'manifestSha256':sha((out/'SHA256SUMS').read_bytes())}),flush=True)

if __name__=='__main__':main()
