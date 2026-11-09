#!/usr/bin/env python3
"""Exact 14 historical review inputs and independent second-block FSST control."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from compile import compile_normalizer
from fsst import qlever_vocabulary

ROOT = Path(__file__).resolve().parent
BASE = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round2')
def sha(data): return hashlib.sha256(data).hexdigest()
def readback(src, dest):
    dest.mkdir(parents=True, exist_ok=False)
    manifest = (src/'SHA256SUMS').read_bytes(); seen = set()
    index=json.loads((ROOT/'qa_round2/INDEX.json').read_bytes())
    expected=next(entry['manifestSha256'] for entry in index['readbacks'] if entry['path']==str(src))
    assert sha(manifest)==expected, 'review manifest identity changed'
    for line in manifest.decode().splitlines():
        pin, relative = line.split('  ',1)
        path = (src/relative).resolve()
        assert path.is_relative_to(src.resolve()) and relative not in seen
        seen.add(relative); raw=path.read_bytes(); assert sha(raw)==pin,relative
        target=dest/relative; target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(raw)
    assert seen=={str(p.relative_to(src)) for p in src.rglob('*') if p.is_file() and p!=src/'SHA256SUMS'}
    (dest/'SHA256SUMS').write_bytes(manifest)
    return sha(manifest)

def main():
    if shutil.disk_usage(ROOT).free < 5*1024**3: raise RuntimeError('below disk floor')
    out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
    results=[]; retained={}
    for group in ('probe-02','encoded-key-01','validation-01'):
        retained[group]=readback(BASE/group,out/'original'/group)
    for group in ('probe-02','encoded-key-01'):
        source=out/'original'/group
        summary=json.loads((source/'summary.json').read_bytes())
        for scenario in summary['scenarios']:
            name=scenario.get('name',scenario.get('encoding')); src=source/name
            dest=out/'replay'/group/name;dest.mkdir(parents=True)
            raw=(src/'raw.jsonl').read_bytes();spec=json.loads((src/'case.json').read_bytes())
            assert sha(raw)==scenario['rawSha256']
            parser=compile_normalizer(spec);(dest/'normalizer.py').write_bytes(parser)
            process=subprocess.run([sys.executable,'-I','-B',str(dest/'normalizer.py')],input=raw,capture_output=True,timeout=180)
            (dest/'stderr').write_bytes(process.stderr);(dest/'records.json').write_bytes(process.stdout)
            assert process.returncode==0,(name,process.stderr.decode())
            record=json.loads(process.stdout)
            physical={}
            for line in raw.splitlines():
                sample=json.loads(base64.b64decode(json.loads(line)['rawBase64']))
                physical[sample['phase']]={item['fileId']:base64.b64decode(item['bytes']) for item in sample['files']}

            # [EXP-ER01-S-R3] Why: exact retained seed oracles distinguish finding from refusal.
            # Rejected: counting any non-PASS as evidence the planted bytes were actually searched.
            if name=='nominal': assert record['status']=='PASS',record
            else: assert record['status']!='PASS',name
            for check in scenario.get('checks',[]):
                scan=next(v for v in record['scans'] if v['scan']==check['scan'] and v['location']==check['location'])
                assert scan['status']!='PASS',(name,scan)
                if check['scan']=='P':
                    assert scan['observations']['rotate']['protectedHits']>0 or (name=='superseded-within-commit-wal' and scan['status']=='REFUSED'),(name,scan)
            if group=='encoded-key-01':
                d=next(v for v in record['scans'] if v['scan']=='D')
                assert d['observations']['rotate'][0]['opened'] is True,(name,d)
                k=next(v for v in record['scans'] if v['scan']=='K' and v['location']=='d-keys-heap')
                assert k['status']=='FAIL',(name,k)
            for scan in record['scans']:
                for phase_name, phase in scan.get('coverage',{}).items():
                    for file_id, file in phase.items():
                        assert file['parsedBytes']+file['unparsedBytes']==file['size']
                        if scan['status']=='PASS': assert file['unparsedBytes']==0
                        data=physical[phase_name][file_id]
                        assert file['sha256']==sha(data)
                        if file.get('format')=='sqlite-wal/4':
                            size=file['pageSize'];images=file['physicalImages']
                            assert [v['frameOffset'] for v in images]==list(range(32,len(data),size+24))
                            for image in images:
                                a,b=image['bodyRange']; offset=image['frameOffset']
                                assert [a,b]==[offset+24,offset+24+size]
                                assert image['bodySha256']==sha(data[a:b])
                                coverage=image['coverage']
                                assert coverage['size']==size and coverage['parsedBytes']+coverage['unparsedBytes']==size
                                assert coverage['parsedRanges']==[[max(c,a)-a,min(d,b)-a] for c,d in file['parsedRanges'] if max(c,a)<min(d,b)]

            results.append({'group':group,'name':name,'status':record['status'],'rawSha256':sha(raw),
                'parserSha256':sha(parser),'runId':spec['runId'],
                'scans':[{'scan':v['scan'],'location':v['location'],'status':v['status'],'observations':v.get('observations')} for v in record['scans'] if v['status']!='PASS'],
                'claim':'new execution over exact historical synthetic input; no live engine collection'})
            print(group+'/'+name+': '+record['status'],flush=True)
    assert len(results)==14
    control=out/'original/validation-01'
    parts={part:(control/('vocabulary.'+part)).read_bytes() for part in ('codebooks','external','offsets','internal','ids')}
    expected=json.loads((control/'vocabulary-block.json').read_bytes())
    words=qlever_vocabulary(parts);index=1<<20
    assert len(words)==expected['decodedCount'] and sha(words[index])==expected['markerSha256'] and words[-1]==words[index]
    assert words[0]==b'w0000000' and words[index-1]==b'w1048575'
    broken=dict(parts);broken['codebooks']=(1).to_bytes(8,'little')+parts['codebooks'][8:4616]
    try:qlever_vocabulary(broken)
    except ValueError as error: assert str(error)=='missing FSST block decoder'
    else:raise AssertionError('blind second block did not refuse')
    (out/'summary.json').write_text(json.dumps({'scenarioCount':14,'scenarios':results,'originalManifestSha256':retained,
        'secondBlockControl':'exact marker at 1048576; missing second codebook REFUSED','scope':'offline replay only'},sort_keys=True)+'\n')
if __name__=='__main__':main()
