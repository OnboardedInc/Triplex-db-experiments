#!/usr/bin/env python3
"""Read-only replay of recorded live evidence; never invokes the VM or writes to builder evidence."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent/'round15'
EVIDENCE=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W')
sys.path.insert(0,str(ROOT/'lab/observer'))
import vm_syncwitness as judge
import vm_normalizer as normalizer
import vm_planted_writer as planted

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def load(path):
    return json.loads(path.read_bytes())

def save(name,value):
    (OUT/name).write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')

def manifest(path):
    rows=[]
    for line in path.read_text().splitlines():
        expected,relative=line.split('  ',1)
        assert re.fullmatch('[0-9a-f]{64}',expected)
        target=(EVIDENCE/relative).resolve()
        assert target.is_relative_to(EVIDENCE.resolve()) and target.is_file()
        actual=sha(target);assert actual==expected,(relative,expected,actual)
        rows.append({'path':relative,'sha256':actual,'bytes':target.stat().st_size})
    assert len({r['path'] for r in rows})==len(rows)
    return rows

def replay_session(directory):
    result=load(directory/'RESULT.json');ops=load(directory/'ops.json')
    assert result['profileViolations']==[] and ops['cgroup']=='0::/docker/'+result['writerId']
    assert ops['count']==len(ops['acks']) and [a['lsn'] for a in ops['acks']]==list(range(1,ops['count']+1))
    assert result['dir']==[normalizer.kernel_dev(ops['dir'][0]),ops['dir'][1]]
    for name in ['ops.json','wal.bin','main.bin']:
        assert (directory/name).read_bytes()==(directory/'writer'/name).read_bytes()
    text=(directory/'trace.txt').read_text();stderr=(directory/'stderr.txt').read_text()
    trace=normalizer.parse_witness(text,stderr)
    assert all(trace['begin']['ts']<=a['atNs']<=trace['end']['ts'] for a in ops['acks'])
    replay=judge.judge_run(text,stderr,ops,(directory/'wal.bin').read_bytes(),result['writerCgroupId'],result['dir'])
    mismatches=judge.compare(ops['mode'],replay,ops['count']);assert not mismatches,mismatches
    recorded=json.loads(result['judge']['stdout']);assert result['judge']['status']==0 and result['pass']
    for key in ['primary','codes','globalCodes','problems']:assert replay[key]==recorded[key],(directory,key)
    assert recorded['mismatches']==[]
    rows=replay['perCommit'];assert len(rows)==ops['count']
    for i,row in enumerate(rows,1):
        expected='SYNC-MISSING' if ops['mode']=='mmap' else planted.expected(ops['mode'],i,ops['count'])
        assert row['codes']==([expected] if expected else []),(directory,i,row['codes'],expected)
    return {'mode':ops['mode'],'count':ops['count'],'writerId':result['writerId'],'writerCgroupId':result['writerCgroupId'],
        'directory':result['dir'],'codes':replay['codes'],'globalCodes':replay['globalCodes'],'primary':replay['primary'],
        'perCommitCodeCounts':dict(Counter(c for row in rows for c in row['codes'])),'cleanCommits':sum(not row['codes'] for row in rows),
        'perCommitSha256':hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
        'inputSha256':{n:sha(directory/n) for n in ['RESULT.json','ops.json','wal.bin','main.bin','trace.txt','stderr.txt']},'mismatches':mismatches}

def cost(directory):
    session=replay_session(directory/'w2-cost')
    samples=[json.loads(l) for l in (directory/'w2-cost/bpf-samples.jsonl').read_text().splitlines() if l]
    ops=load(directory/'w2-cost/ops.json');rows=[]
    for a,b in zip(samples,samples[1:]):
        assert b['t']>a['t'] and b['runTimeNs']>=a['runTimeNs'] and b['runCnt']>=a['runCnt']
        commits=sum(a['t']<ack['atNs']<=b['t'] for ack in ops['acks'])
        if commits:rows.append({'from':a['t'],'to':b['t'],'commits':commits,'deltaNs':b['runTimeNs']-a['runTimeNs'],
            'deltaCalls':b['runCnt']-a['runCnt'],'perCommitNs':(b['runTimeNs']-a['runTimeNs'])/commits})
    recorded=load(directory/'W2.json');value=recorded['cost'];assert rows==value['intervals']
    ns=sorted(r['perCommitNs'] for r in rows);p99=ns[math.ceil(len(ns)*.99)-1]
    commits=sum(r['commits'] for r in rows);mean=sum(r['deltaNs'] for r in rows)/commits
    assert p99==value['p99PerCommitNs']==value['maxPerCommitNs'] and mean==value['meanPerCommitNs']
    assert value['samples']==len(samples) and value['intervalCount']==len(rows) and value['gateNs']==100000
    assert value['pass']==(p99<=100000) and recorded['pass']
    return {'path':str(directory.relative_to(EVIDENCE)),'samples':len(samples),'intervals':len(rows),'coveredCommits':commits,
        'totalWriterCommits':len(ops['acks']),'weightedMeanNs':mean,'p99IntervalMeanNs':p99,'medianIntervalMeanNs':ns[math.ceil(len(ns)*.5)-1],
        'p90IntervalMeanNs':ns[math.ceil(len(ns)*.9)-1],'bpfCallsPerCoveredCommit':sum(r['deltaCalls'] for r in rows)/commits,
        'nsPerBpfCall':sum(r['deltaNs'] for r in rows)/sum(r['deltaCalls'] for r in rows),
        'inputSha256':{str(p.relative_to(directory)):sha(p) for p in [directory/'W2.json',directory/'w2-cost/bpf-samples.jsonl',directory/'w2-cost/ops.json']},
        'judgeReplay':session,'scope':'p99 of sampled interval means, not individual-commit latency or ABBA overhead'}

def stream(directory):
    recorded=load(directory/'W3.json');d=directory/'w3-load';result=load(d/'RESULT.json')
    actual=judge.stream_check(d/'trace.txt',(d/'stderr.txt').read_text());assert actual==json.loads(result['streamCheck']['stdout'])
    assert result['streamCheck']['status']==0 and actual['lostEvents']==0 and result['pass'] and recorded['pass']
    assert actual['detachNs']-actual['attachNs']>=1200*10**9
    first=(d/'trace.txt').open().readline().strip().split('|');assert [int(x) for x in first[3:5]]==result['dir']
    done=load(d/'writer-done.json');assert done==load(d/'writer/writer-done.json')
    assert done['commits']==120000 and done['seconds']==1200 and done['rate']==100
    assert recorded['readers']==256 and all((d/'writer'/('reader-ready-'+str(i))).is_file() for i in range(8))
    cpu=result['witnessCpuPercent'];assert cpu['samples']==79 and 0<=cpu['mean']<10 and cpu['max']>=cpu['mean']
    return {'path':str(directory.relative_to(EVIDENCE)),'streamReplay':actual,'writer':done,'recordedCpuSummary':cpu,
        'readerReadyFiles':8,'readerCompletionFiles':len(list((d/'writer').glob('reader-done*'))),
        'inputSha256':{str(p.relative_to(directory)):sha(p) for p in [directory/'W3.json',d/'RESULT.json',d/'trace.txt',d/'stderr.txt',d/'writer-done.json']},
        'limits':'sequence completeness only; no per-commit judgment; raw CPU sample vector and reader poll counts not retained'}

def main():
    rows=manifest(ROOT/'lab/experiments/EXP-OBS01/round15/EVIDENCE-SHA256SUMS')
    assert (EVIDENCE/'SHA256SUMS').read_bytes()==(ROOT/'lab/experiments/EXP-OBS01/round15/EVIDENCE-SHA256SUMS').read_bytes()
    pre=manifest(ROOT/'lab/experiments/EXP-OBS01/round15/EVIDENCE-SHA256SUMS.pre-resize')
    save('manifest-audit.json',{'evidenceRoot':str(EVIDENCE),'manifestSha256':sha(EVIDENCE/'SHA256SUMS'),'files':rows,'preResizeFiles':len(pre),
        'totalBytes':sum(r['bytes'] for r in rows),'currentSourceHead':'cd56cd9c','claim':'verified recorded bytes, not a new live run'})
    modes=[replay_session(EVIDENCE/'w1w2-attempt1'/('w1-'+mode)) for mode in planted.MODES]
    assert len(modes)==11 and all(r['count']==1000 for r in modes)
    save('w1-replay.json',{'modes':modes,'vmLabel':'6 CPU / 12 GiB (pre-resize); not rerun on resized VM'})
    attaches=[replay_session(EVIDENCE/p/'w0-attach') for p in ['w0-attempt6','resized/w0w2-attempt1']]
    save('w0-attach-replay.json',{'sessions':attaches})
    costs=[cost(EVIDENCE/p) for p in ['w1w2-attempt1','w2-attempt2','resized/w0w2-attempt1']]
    save('w2-replay.json',{'runs':costs})
    streams=[stream(EVIDENCE/p) for p in ['w3-attempt1','resized/w3-attempt1']]
    save('w3-replay.json',{'runs':streams})
    copies={'W0.attempt6-PASS.json':'w0-attempt6/W0.json','W1.json':'w1w2-attempt1/W1.json','W2.attempt1.json':'w1w2-attempt1/W2.json',
        'W2.attempt2.json':'w2-attempt2/W2.json','W3.json':'w3-attempt1/W3.json','resized-W0.json':'resized/w0w2-attempt1/W0.json',
        'resized-W2.json':'resized/w0w2-attempt1/W2.json','resized-W3.json':'resized/w3-attempt1/W3.json'}
    for repo,external in copies.items():assert (ROOT/'lab/experiments/EXP-OBS01/round15'/repo).read_bytes()==(EVIDENCE/external).read_bytes()
    save('copy-and-environment-audit.json',{'byteIdenticalCopies':copies,
        'reviewWorktreeVmConfig':load(ROOT/'lab/config/slots.json')['vm'],
        'currentMainVmConfig':load(Path('/Users/sam/projects/triplex-db-2/lab/config/slots.json'))['vm'],
        'environmentBindingLimit':'CPU count appears in contemporaneous load logs; RAM sizes are configuration labels, not per-attempt MemTotal receipts'})
    print('Verified',len(rows),'manifest files;',len(modes),'W1 modes; 2 W0 attaches; 3 W2 costs; 2 W3 streams',flush=True)

if __name__=='__main__':main()
