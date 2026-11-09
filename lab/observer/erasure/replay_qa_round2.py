#!/usr/bin/env python3
"""Replay the reviewer's exact 31 retained cases; inputs remain labeled historical."""
import base64
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from compile import compile_normalizer

ROOT = Path(__file__).resolve().parent
BASE = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S')

def sha(raw): return hashlib.sha256(raw).hexdigest()

def main():
    output = Path(sys.argv[1]).resolve()
    if shutil.disk_usage(ROOT).free < 5 * 1024 ** 3: raise RuntimeError('below 5 GiB disk floor')
    output.mkdir(parents=True, exist_ok=False)
    pins = {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in str(p)}
    results = []
    for group in ('attempt-01', 'coverage-02'):
        summary = json.loads((BASE / group / 'summary.json').read_bytes())
        for scenario in summary['scenarios']:
            name = scenario['name']; src = BASE / group / name
            dest = output / group / name; dest.mkdir(parents=True)
            raw = (src / 'raw.jsonl').read_bytes(); spec = json.loads((src / 'case.json').read_bytes())
            assert sha(raw) == scenario['rawSha256']
            parser = compile_normalizer(spec)
            for file in ('case.json','raw.jsonl','comparison.json'): shutil.copyfile(src/file,dest/file)
            (dest/'normalizer.py').write_bytes(parser)
            proc = subprocess.run([sys.executable,'-I','-B',str(dest/'normalizer.py')],input=raw,capture_output=True,timeout=120)
            (dest/'stderr').write_bytes(proc.stderr)
            if proc.returncode: raise RuntimeError((name,proc.stderr.decode()))
            record = json.loads(proc.stdout); (dest/'records.json').write_bytes(proc.stdout)
            # [EXP-ER01-S-R2] Why: retained independent SQL/decrypt proofs determine negative cases.
            # Rejected: executing the old review's intentional false-PASS assertions unchanged.
            if name != 'baseline' and record['status'] == 'PASS':
                raise AssertionError((name,'unsafe aggregate PASS'))
            for scan in record['scans']:
                for phase in scan.get('coverage',{}).values():
                    for file in phase.values():
                        assert file['parsedBytes'] + file['unparsedBytes'] == file['size']
                        if scan['status']=='PASS': assert file['unparsedBytes']==0
            if name=='sqlite-overflow-plaintext':
                for scan in record['scans']:
                    if scan['scan']=='P' and scan['location'] in ('q-broker-sqlite','q-recent-rows-h1','q-broker-wal'):
                        assert scan.get('observations',{}).get('rotate',{}).get('protectedHits',0)>0, scan
            if name=='sqlite-overflow-envelope':
                for scan in record['scans']:
                    if scan['scan']=='C' and scan['location'] in ('q-broker-sqlite','q-recent-rows-h1'):
                        assert scan.get('observations',{}).get('rotate',{}).get('targetHits',0)>0,scan
            if name.startswith('new-wrapper-old-wal-') or name.startswith('new-wrapper-d-keys-'):
                d=next(scan for scan in record['scans'] if scan['scan']=='D')
                assert d.get('observations',{}).get('rotate',[{}])[0].get('opened') is True,(name,d)
            result={'group':group,'name':name,'status':record['status'],'rawSha256':sha(raw),'normalizerSha256':sha(parser),
                    'independentOracle':scenario.get('oracle'), 'inputRunId':spec['runId'],
                    'execution':'new parser replay of exact retained QA bytes; not a fresh engine collection'}
            results.append(result); print(group+'/'+name+': '+record['status'],flush=True)
    assert len(results)==31,len(results)
    for rel,pin in pins.items(): assert sha((ROOT/rel).read_bytes())==pin,rel
    (output/'summary.json').write_text(json.dumps({'scenarioCount':31,'scenarios':results,'sourceSha256':pins},sort_keys=True)+'\n')
    lines=[]
    for p in sorted(output.rglob('*')):
        if p.is_file(): lines.append(sha(p.read_bytes())+'  '+str(p.relative_to(output)))
    (output/'SHA256SUMS').write_text('\n'.join(lines)+'\n')

if __name__=='__main__': main()
