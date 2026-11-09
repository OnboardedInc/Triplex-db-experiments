#!/usr/bin/env python3
"""Replay recorded R16 W1/W4 bytes and independently calculate ABBA A/A bands."""
import hashlib
import json
import math
from pathlib import Path
import sys
import review_round15 as prior

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round16'
BASE=prior.EVIDENCE
E=BASE/'r16'
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_w4_judge as w4
prior.OUT=OUT
load=prior.load
save=prior.save

def main():
    prior.EVIDENCE=E
    manifest=ROOT/'lab/experiments/EXP-OBS01/round16/EVIDENCE-SHA256SUMS'
    rows=prior.manifest(manifest)
    assert manifest.read_bytes()==(E/'SHA256SUMS').read_bytes()
    listed={str((E/r['path']).resolve()) for r in rows}
    actual={str(p.resolve()) for p in E.rglob('*') if p.is_file() and p!=E/'SHA256SUMS'}
    assert listed==actual,(len(listed),len(actual),sorted(actual-listed))
    save('manifest-audit.json',{'root':str(E),'files':rows,'fileCount':len(rows),'totalBytes':sum(r['bytes'] for r in rows),'sha256':prior.sha(manifest)})
    modes=[prior.replay_session(E/'w1-resized'/('w1-'+m)) for m in prior.planted.MODES]
    assert len(modes)==11 and all(m['count']==1000 for m in modes)
    save('w1-replay.json',{'modes':modes,'environmentSha256':prior.sha(E/'vm-facts-w1.txt')})
    facts=(E/'vm-facts-w1.txt').read_text()
    assert '\n8\nMemTotal:       20436420 kB\n' in facts and '\n6.8.0-117-generic\n' in facts
    assert 'triplex2    Running    aarch64    8       20GiB' in facts
    prior.EVIDENCE=BASE
    costs=[prior.cost(BASE/p) for p in ['w1w2-attempt1','w2-attempt2','resized/w0w2-attempt1']]
    assert math.isclose(costs[1]['p90IntervalMeanNs'],52371.333333333336)
    save('w2-corrections.json',{'runs':costs})
    ab=[]
    for i in [1,2]:
        d=E/('abba-attempt'+str(i));r=load(d/'ABBA.json');summaries={};streams=[]
        for arm in r['arms']:
            p=d/'abba'/arm['label'];v=load(p/'samples.json');res=load(p/'RESULT.json')
            assert (p/'samples.json').read_bytes()==(p/'writer/samples.json').read_bytes()
            vals=v['samplesNs'];assert len(vals)==v['count']==arm['n']==2000 and v['rowsPerCommit']==10
            assert all(type(x) is int and x>0 for x in vals)
            ordered=sorted(vals);summaries[arm['label']]={'n':len(vals),'p99':ordered[math.ceil(.99*len(vals))-1],'sha256':prior.sha(p/'samples.json')}
            assert res['pass'] and res['writerId'] and res['writerCgroupId']>0
            if arm['kind']=='B':
                s=prior.judge.stream_check(p/'trace.txt',(p/'stderr.txt').read_text())
                assert s==json.loads(res['streamCheck']['stdout'])==json.loads(arm['streamCheck']['stdout'])
                assert s['lostEvents']==0 and res['streamCheck']['status']==0 and res['profileViolations']==[]
                t=prior.normalizer.parse_witness((p/'trace.txt').read_text(),(p/'stderr.txt').read_text())
                assert res['dir']==[t['begin']['d1'],t['begin']['i1']]
                assert any(e.get('cg')==res['writerCgroupId'] for e in t['events'])
                streams.append(s)
            else:assert not (p/'trace.txt').exists()
        ratios=[summaries[f'aa{j}-2']['p99']/summaries[f'aa{j}-1']['p99'] for j in range(1,4)]
        logs=[math.log(x) for x in ratios];m=sum(logs)/3;sd=math.sqrt(sum((x-m)**2 for x in logs)/2)
        band=max(max(abs(x-1) for x in ratios),math.exp(2*sd)-1)
        assert math.isclose(band,r['analysis']['aa']['band'],rel_tol=1e-14)
        assert band>.05 and r['analysis']['verdict']=='INCONCLUSIVE'
        assert len(summaries)==18 and len(streams)==6
        ab.append({'attempt':i,'summaries':summaries,'ratios':ratios,'band':band,'streamChecks':streams,'verdict':r['analysis']['verdict']})
    save('abba-independent.json',{'attempts':ab})
    rehearsals=[]
    for mode,index in [('full',1),('off',2)]:
        d=E/'w4-rehearsal3/w4'/(str(index).zfill(2)+'-'+mode);r=load(d/'RESULT.json')
        v=w4.judge_trial(mode,(d/'trace.txt').read_text(),(d/'writer.txt').read_text(),(d/'broker.db').read_bytes(),(d/'broker.db-wal').read_bytes(),r['writerCgroupId'])
        assert v==r['judge'] and r['rehearsal'] and not r['crashed'] and v['pass']
        assert r['profileViolations']==[] and r['dir']==[prior.normalizer.kernel_dev(w4.read_stream((d/'writer.txt').read_text())['ready']['dev']),w4.read_stream((d/'writer.txt').read_text())['ready']['dir']]
        rehearsals.append(v)
    assert rehearsals[0]['witnessed']==5299 and rehearsals[1]['acked']==21167 and rehearsals[1]['witnessed']==0
    agg=w4.aggregate(rehearsals);assert not agg['pass'] and not agg['premiseHolds']
    # [CX-VOBS7-R17] Why: historical rehearsals predate collection receipts; preserve their counts but require the new aggregate to refuse unverified collection. Rejected: manufacturing retrospective receipts or weakening per-trial replay assertions.
    recorded=load(E/'w4-rehearsal3/W4.json');assert agg=={**recorded['aggregate'],'counted':2,'refused':0,'reasons':[
        'only 2 of 10 crash trials gave evidence','trial(s) without a verified store collection record: 1, 2',
        'no unwitnessed OFF commit was lost: the class premise (Q100r) is reopened']} and not recorded['pass'] and recorded['rehearsal']
    save('w4-rehearsal-replay.json',{'trials':rehearsals,'aggregate':agg,'claim':'writer SIGKILL only; guest crash and recovery are untested'})
    copies={'W1.resized.json':'w1-resized/W1.json','ABBA.attempt1.json':'abba-attempt1/ABBA.json','ABBA.attempt2.json':'abba-attempt2/ABBA.json',
        'W4.rehearsal3.json':'w4-rehearsal3/W4.json','vm-facts-w1.txt':'vm-facts-w1.txt'}
    for local,external in copies.items():assert (ROOT/'lab/experiments/EXP-OBS01/round16'/local).read_bytes()==(E/external).read_bytes()
    save('copy-audit.json',copies)
    print('Verified manifest, 11 W1 modes, 3 W2 corrections, 36 ABBA arms, 12 B streams, and 2 W4 writer-kill rehearsals')

if __name__=='__main__':main()
