#!/usr/bin/env python3
"""Preserve initial failures; finish the corrected reviewer IR fixture and stronger W4 reproductions."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round16'
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_normalizer as n
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    old=json.loads((OUT/'RUN.json').read_text());pins={p:sha((ROOT/p).read_bytes()) for p in old['sourceSha256']}
    pins['lab/verify/CX-VOBS7/followup_round16.py']=sha(Path(__file__).read_bytes())
    result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),'sourceSha256':pins,'commands':[],
        'reason':'correct the reviewer-only IR fixture probe alias; add a lost-sync/lost-commit reproduction and verify recorded prefixes; implementation unchanged'}
    for label,argv in [('ir-continuation',['node','--test','--test-name-pattern=golden independently',str(HERE/'review_round16.mjs')]),
        ('w4-expanded',['python3','-B',str(HERE/'test_round16_adversarial.py')])]:
        c=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=300,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(label+'.stdout')).write_bytes(c.stdout);(OUT/(label+'.stderr')).write_bytes(c.stderr)
        result['commands'].append({'name':label,'argv':argv,'exit':c.returncode,'stdoutSha256':sha(c.stdout),'stderrSha256':sha(c.stderr)})
        print(label,c.returncode,flush=True)
    prefixes=[]
    for mode,index in [('full',1),('off',2)]:
        d=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/r16/w4-rehearsal3/w4')/(str(index).zfill(2)+'-'+mode)
        scan=n.WitnessScan(True)
        for i,line in enumerate((d/'trace.txt').read_text().split('\n')[:-1],1):scan.feed(line,i)
        reasons=[]
        for cpu,bucket in scan.cpus.items():
            if len(bucket)!=max(bucket):reasons.append('CPU '+str(cpu)+' sequence gap')
            ts=[bucket[k] for k in sorted(bucket)]
            if any(a>b for a,b in zip(ts,ts[1:])):reasons.append('CPU '+str(cpu)+' timestamp regression')
        if scan.low<scan.begin['ts']:reasons.append('event before attach')
        assert not reasons,reasons
        assert (d/'witness-stderr.txt').read_bytes()==b''
        prefixes.append({'mode':mode,'events':scan.total,'cpus':len(scan.cpus),'prefixReasons':reasons,'traceSha256':sha((d/'trace.txt').read_bytes())})
    (OUT/'w4-recorded-prefix-audit.json').write_text(json.dumps(prefixes,indent=2)+'\n')
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==v for p,v in pins.items());assert result['sourceUnchanged']
    result['finishedNs']=time.time_ns()
    (OUT/'FOLLOWUP.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))

if __name__=='__main__':main()
