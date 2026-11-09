#!/usr/bin/env python3
"""Replay all 16 exact round-3 reviewer captures with new frozen parsers."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from compile import compile_normalizer

ROOT=Path(__file__).resolve().parent
BASE=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round3')
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('disk floor')
    out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
    index=json.loads((ROOT/'qa_round3/INDEX.json').read_bytes());results=[];manifests={}
    for group in ('probe-01','validation-01','native-envelope-01'):
        source=BASE/group;dest=out/'original'/group
        manifest=(source/'SHA256SUMS').read_bytes()
        expected=next(r['manifestSha256'] for r in index['readbacks'] if r['path']==str(source))
        assert sha(manifest)==expected
        dest.mkdir(parents=True);seen=set()
        for line in manifest.decode().splitlines():
            pin,rel=line.split('  ',1);path=(source/rel).resolve()
            assert path.is_relative_to(source) and rel not in seen
            seen.add(rel);raw=path.read_bytes();assert sha(raw)==pin,rel
            target=dest/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        assert seen=={str(p.relative_to(source)) for p in source.rglob('*') if p.is_file() and p!=source/'SHA256SUMS'}
        (dest/'SHA256SUMS').write_bytes(manifest);manifests[group]=sha(manifest)
        summary=json.loads((dest/'summary.json').read_bytes())
        scenarios=summary.get('scenarios',summary.get('focusedScenarios'))
        if scenarios is None:scenarios=[dict(summary,name='native-envelope-remove-policy')]
        for scenario in scenarios:
            name=scenario['name'];src=dest/name if (dest/name/'raw.jsonl').exists() else dest
            raw=(src/'raw.jsonl').read_bytes();spec=json.loads((src/'case.json').read_bytes())
            assert sha(raw)==scenario['rawSha256']
            replay=out/'replay'/group/name;replay.mkdir(parents=True)
            parser=compile_normalizer(spec);(replay/'normalizer.py').write_bytes(parser)
            process=subprocess.run([sys.executable,'-I','-B',str(replay/'normalizer.py')],input=raw,capture_output=True,timeout=180)
            (replay/'stderr').write_bytes(process.stderr);(replay/'records.json').write_bytes(process.stdout)
            assert process.returncode==0,(name,process.stderr.decode())
            record=json.loads(process.stdout)
            # [EXP-ER01-S-R4] Why: prove positive recovery rather than qualifying by blanket refusal.
            # Rejected: accepting only an aggregate non-PASS on a planted decoding regression.
            negative=name not in ('nominal','removed-key-envelope-superseded-frame')
            if negative:assert record['status']!='PASS',(name,record)
            else:assert record['status']=='PASS',(name,record)
            for check in scenario.get('checks',[]):
                scan=next(v for v in record['scans'] if v['scan']==check['scan'] and v['location']==check['location'])
                if negative and check.get('unsafe'):assert scan['status'] in ('FAIL','REFUSED'),(name,scan)
                if negative and check['scan']=='P':assert scan['observations']['rotate']['protectedHits']>0,(name,scan)
                if negative and check['scan']=='C':assert scan['observations']['rotate']['targetHits']>0,(name,scan)
                if negative and check['scan']=='K':assert any(row['targetHits'] for row in scan['observations']['rotate']),(name,scan)
                if negative and check['scan']=='D':assert scan['observations']['rotate'][0]['opened'] is True,(name,scan)
            if any(word in name for word in ('usable-key','fresh-key-record')):
                d=next(v for v in record['scans'] if v['scan']=='D')
                assert d['observations']['rotate'][0]['opened'] is True,(name,d)
            if group=='native-envelope-01':
                c=next(v for v in record['scans'] if v['scan']=='C' and v['location']=='q-recent-rows-h1')
                assert c['status']=='FAIL' and all(c['observations'][p]['targetHits']>0 for p in ('shred','rotate')),(name,c)
            for scan in record['scans']:
                for phase in scan.get('coverage',{}).values():
                    for file in phase.values():
                        assert file['parsedBytes']+file['unparsedBytes']==file['size']
                        if scan['status']=='PASS':assert file['unparsedBytes']==0
            results.append({'group':group,'name':name,'status':record['status'],'rawSha256':sha(raw),'parserSha256':sha(parser),
                'runId':spec['runId'],'claim':'new execution of exact historical synthetic bytes; no engine recollection'})
            print(group+'/'+name+': '+record['status'],flush=True)
    assert len(results)==16,len(results)
    (out/'summary.json').write_text(json.dumps({'scenarios':results,'scenarioCount':16,'originalManifestSha256':manifests},sort_keys=True)+'\n')
if __name__=='__main__':main()
