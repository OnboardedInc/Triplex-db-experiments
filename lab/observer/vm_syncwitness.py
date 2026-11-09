#!/usr/bin/env python3
"""Evaluator-side replay of one planted-writer run (probe W1) through the same parser and join the normalizer uses.

The VM harness copies the witness trace, bpftrace stderr, the writer's ops.json and the final WAL bytes out of the VM; this
module judges them offline with vm_normalizer.parse_witness / judge_witness, so W1 receipts and unit fixtures share one path.
"""
import json
from pathlib import Path
import sys
import vm_normalizer as n
from vm_planted_writer import expected

def judge_run(trace_text,stderr_text,ops,wal,cgroup_id,dir_pair=None,polls=None):
    """Returns {'primary','codes','perCommit'}; never raises for witness refusals (they are the answer)."""
    try:
        trace=n.parse_witness(trace_text,stderr_text)
    except n.WitnessError as error:
        return {'primary':error.code,'codes':[error.code],'problems':[str(error)],'perCommit':[]}
    wanted=tuple(dir_pair or (n.kernel_dev(ops['dir'][0]),ops['dir'][1]))
    problems=[]
    if trace['dirs']!={wanted}:problems.append(('WITNESS-UNBOUND','traced directory differs from the writer directory'))
    ends=n.wal_commits(wal);by_lsn={a['lsn']:a['atNs'] for a in ops['acks']}
    views=[{'end':end,'U':None,'visible':False,'acks':[by_lsn[i+1]] if i+1 in by_lsn else []} for i,end in enumerate(ends)]
    store={'wal':(n.kernel_dev(ops['wal'][0]),ops['wal'][1]),'main':(n.kernel_dev(ops['main'][0]),ops['main'][1]),'cgroup':cgroup_id,'walLen':len(wal)}
    verdict=n.judge_witness(trace,store,views);problems.extend(verdict['problems'])
    codes=[code for code,_ in problems];primary=min(codes,key=n.WITNESS_CODES.index) if codes else None
    return {'primary':primary,'codes':sorted(set(codes),key=n.WITNESS_CODES.index),'problems':[a+': '+b for a,b in problems],'perCommit':verdict['perCommit']}

def compare(mode,result,count):
    """Check a judged W1 run against vm_planted_writer.expected; returns a list of mismatches (empty means the mode behaved)."""
    mismatches=[]
    if mode=='mmap':
        return [] if result['primary']=='UNWITNESSED-WRITE' else ['mmap run was not refused UNWITNESSED-WRITE: '+str(result['primary'])]
    rows=result['perCommit']
    if len(rows)!=count:return ['witnessed commit count '+str(len(rows))+' != '+str(count)]
    for index,row in enumerate(rows,1):
        want=expected(mode,index,count);got=min(row['codes'],key=n.WITNESS_CODES.index) if row['codes'] else None
        if want!=got:mismatches.append('commit '+str(index)+' expected '+str(want)+' got '+str(got))
        if len(mismatches)>=10:break
    return mismatches

def stream_check(trace_path,stderr_text=''):
    """Loss check for traces too large to parse whole (W3): line by line, same grammar and per-CPU sequence rules as parse_witness."""
    seen={};counts={};begin=end=None;events=0
    with open(trace_path,'r',encoding='utf-8') as handle:
        for line in handle:
            line=line.rstrip('\n')
            if not line.strip():continue
            if line.startswith('@n['):
                match=n.re.fullmatch(r'@n\[([0-9]{1,5})\]: ([0-9]{1,19})',line)
                if not match or end is None or int(match[1]) in counts:raise n.WitnessError('TRACE-INCOMPLETE','bad/duplicate per-CPU count')
                counts[int(match[1])]=int(match[2]);continue
            parts=line.split('|')
            if parts[0]!='SW1' or len(parts)<3 or parts[1] not in n.SW_LAYOUT or len(parts)-2!=len(n.SW_LAYOUT[parts[1]].split()):raise n.WitnessError('TRACE-INCOMPLETE','unparseable record')
            if parts[1]=='B':begin=parts;continue
            if parts[1]=='Z':end=parts;continue
            if begin is None or end is not None:raise n.WitnessError('TRACE-INCOMPLETE','record outside attach/detach')
            names=n.SW_LAYOUT[parts[1]].split();cpu=int(parts[2]);seq=int(parts[3]);bucket=seen.setdefault(cpu,set())
            if names[:2]!=['cpu','seq'] or seq<1 or seq in bucket:raise n.WitnessError('TRACE-INCOMPLETE','duplicate/invalid sequence')
            bucket.add(seq);events+=1
    if begin is None or end is None:raise n.WitnessError('TRACE-INCOMPLETE','missing start/detach record')
    for cpu,bucket in seen.items():
        if len(bucket)!=max(bucket) or counts.get(cpu)!=len(bucket):raise n.WitnessError('TRACE-INCOMPLETE','lost events on CPU '+str(cpu))
    lost=sum(int(m[1]) for m in n.re.finditer(r'\blost\s+([0-9]+)\s+events?\b',stderr_text,n.re.I))
    if lost:raise n.WitnessError('TRACE-INCOMPLETE','bpftrace reported '+str(lost)+' lost events')
    return {'events':events,'cpus':len(seen),'lostEvents':0,'attachNs':int(begin[2]),'detachNs':int(end[2])}

if __name__=='__main__':
    if sys.argv[1]=='stream-check':
        try:print(n.packed(stream_check(sys.argv[2],Path(sys.argv[3]).read_text() if len(sys.argv)>3 else '')).decode())
        except n.WitnessError as error:print(str(error));sys.exit(2)
        sys.exit(0)
    directory=Path(sys.argv[1]);ops=json.loads((directory/'ops.json').read_bytes())
    result=judge_run((directory/'trace.txt').read_text(),(directory/'stderr.txt').read_text() if (directory/'stderr.txt').exists() else '',
        ops,(directory/'wal.bin').read_bytes(),int(sys.argv[2]))
    result['mismatches']=compare(ops['mode'],result,ops['count'])
    print(n.packed({k:v for k,v in result.items() if k!='perCommit'}).decode())
    sys.exit(1 if result['mismatches'] else 0)
