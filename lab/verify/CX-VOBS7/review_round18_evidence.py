#!/usr/bin/env python3
"""Read-only replay of the live receipt-printing collector rehearsal; no VM operations."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round18'
E=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/r18')
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_w4_judge as j
import vm_normalizer as n
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def load(p):return json.loads(p.read_bytes())
def save(name,v):(OUT/name).write_text(json.dumps(v,indent=2,sort_keys=True)+'\n')

def main():
    manifest=ROOT/'lab/experiments/EXP-OBS01/round18/EVIDENCE-SHA256SUMS'
    assert manifest.read_bytes()==(E/'SHA256SUMS').read_bytes()
    files=[]
    for line in manifest.read_text().splitlines():
        expected,relative=line.split('  ',1);p=(E/relative).resolve()
        assert re.fullmatch('[0-9a-f]{64}',expected) and p.is_relative_to(E.resolve()) and p.is_file()
        assert sha(p)==expected,relative
        files.append({'path':relative,'sha256':expected,'bytes':p.stat().st_size})
    listed={str((E/r['path']).resolve()) for r in files}
    actual={str(p.resolve()) for p in E.rglob('*') if p.is_file() and p!=E/'SHA256SUMS'}
    assert len(files)==23 and len(listed)==23 and listed==actual
    save('manifest-audit.json',{'files':files,'bytes':sum(f['bytes'] for f in files),'manifestSha256':sha(manifest),'root':str(E)})
    d=E/'w4-rehearsal-r18';results=[];recorded=load(d/'W4.json')
    for index,mode in [(1,'full'),(2,'off')]:
        trial=d/'w4'/(str(index).zfill(2)+'-'+mode);r=load(trial/'RESULT.json');collection=load(trial/'collection.json')
        raw={name:(trial/name).read_bytes() for name in ['broker.db','broker.db-wal','trace.txt','writer.txt','witness-stderr.txt','writer-stderr.txt']}
        assert r['index']==index and r['mode']==mode and r['rehearsal'] and not r['crashed'] and r['profileViolations']==[]
        assert collection['receiptError'] is None and all(collection['copy'].get(name) is True for name in j.STORE_FILES)
        assert j.verify_collection(collection,{name:raw[name] for name in j.STORE_FILES})==(True,None,None,False)
        sizes={}
        for name in j.STORE_FILES:
            row=collection['receipt']['files'][name]
            assert len(raw[name])==row['size'] and hashlib.sha256(raw[name]).hexdigest()==row['sha256']
            sizes[name]=row
        text=raw['trace.txt'].decode();stream=raw['writer.txt'].decode();err=raw['witness-stderr.txt'].decode()
        trace=j.read_trace(text,err);ready=j.read_stream(stream);assert not ready['problems'] and ready['ready']
        assert r['dir']==[n.kernel_dev(ready['ready']['dev']),ready['ready']['dir']]
        assert tuple(r['dir']) in trace['dirs'] and not trace['detached']
        assert re.fullmatch('[0-9a-f]{64}',r['writerId']) and type(r['writerCgroupId']) is int and r['writerCgroupId']>0
        assert any(e.get('cg')==r['writerCgroupId'] and e.get('ino')==ready['ready']['wal'] for e in trace['events'])
        acks=ready['acks'];assert [a['lsn'] for a in acks]==list(range(1,len(acks)+1))
        assert all(a['atNs']>=trace['begin']['ts'] and a['walEnd']<=len(raw['broker.db-wal']) for a in acks)
        assert all(a['atNs']<=b['atNs'] and a['walEnd']<=b['walEnd'] for a,b in zip(acks,acks[1:]))
        replay=j.judge_trial(mode,text,stream,raw['broker.db'],raw['broker.db-wal'],r['writerCgroupId'],collection,err)
        assert replay==r['judge']==recorded['trials'][index-1]['judge'] and replay['pass'] and replay['collection']=='verified'
        assert replay['ackedLostCount']==0 and not replay['walAbsentConfirmed']
        argv=['python3','-B',str(ROOT/'lab/observer/vm_w4_judge.py'),str(trial),mode,str(r['writerCgroupId'])]
        cli=subprocess.run(argv,capture_output=True,timeout=60);assert cli.returncode==0 and not cli.stderr and json.loads(cli.stdout)==replay
        # [CX-VOBS7-R18] Why: verify refusal is reached for damaged copies even with a valid live receipt. Rejected: checking only the recorded 'collection: verified' label.
        for damaged,expected in [(None,'COPY-FAILED'),(raw['broker.db-wal'][:-1],'COPY-INCOMPLETE'),(b'','COPY-INCOMPLETE')]:
            bad=j.judge_trial(mode,text,stream,raw['broker.db'],damaged,r['writerCgroupId'],collection,err)
            assert not bad['pass'] and bad['refusal']==expected and 'unwitnessedLostCount' not in bad
        results.append({'index':index,'mode':mode,'writerId':r['writerId'],'writerCgroupId':r['writerCgroupId'],'dir':r['dir'],
            'bootIdBefore':r['bootIdBefore'],'sizesAndHashes':sizes,'judge':replay,'cli':{'argv':argv,'exit':cli.returncode,'stdoutSha256':hashlib.sha256(cli.stdout).hexdigest()},
            'inputSha256':{p.name:sha(p) for p in trial.iterdir() if p.is_file()}})
    assert results[0]['judge']['acked']==1982 and results[0]['judge']['witnessed']==1982 and results[0]['judge']['survived']==1983
    assert results[1]['judge']['acked']==3143 and results[1]['judge']['witnessed']==0 and results[1]['judge']['survived']==3144
    assert results[0]['writerId']!=results[1]['writerId'] and results[0]['writerCgroupId']!=results[1]['writerCgroupId']
    agg=j.aggregate([r['judge'] for r in results]);assert agg==recorded['aggregate'] and not agg['pass'] and not agg['premiseHolds']
    assert recorded['rehearsal'] and not recorded['pass'] and load(d/'RESULT.json')['status']=='FAIL'
    save('live-rehearsal-replay.json',{'trials':results,'aggregate':agg,'claim':'fresh offline replay of recorded writer-kill rehearsal; no guest crash or recovery qualification'})
    copies={'W4.rehearsal-r18.json':'W4.json','W4.rehearsal-r18.RESULT.json':'RESULT.json',
        'collection.01-full.json':'w4/01-full/collection.json','collection.02-off.json':'w4/02-off/collection.json',
        'trial.01-full.RESULT.json':'w4/01-full/RESULT.json','trial.02-off.RESULT.json':'w4/02-off/RESULT.json'}
    for local,external in copies.items():assert (ROOT/'lab/experiments/EXP-OBS01/round18'/local).read_bytes()==(d/external).read_bytes()
    assert (ROOT/'lab/experiments/EXP-OBS01/round18/w4-rehearsal-r18.log').read_bytes()==(E/'w4-rehearsal-r18.log').read_bytes()
    save('copy-audit.json',copies)
    print('Verified 23 manifest files, both collector receipts, exact trial/aggregate replay and CLI output; no crash result claimed')

if __name__=='__main__':main()
