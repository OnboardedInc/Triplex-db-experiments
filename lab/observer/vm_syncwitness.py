#!/usr/bin/env python3
"""Evaluator-side replay of one planted-writer run (probe W1) through the same parser and join the normalizer uses.

The VM harness copies the witness trace, bpftrace stderr, the writer's ops.json and the final WAL bytes out of the VM; this
module judges them offline with vm_normalizer.parse_witness / judge_witness, so W1 receipts and unit fixtures share one path.
"""
import json
from pathlib import Path
import sys
import vm_normalizer as n
import vm_planted_writer as planted
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
    return {'primary':primary,'codes':sorted(set(codes),key=n.WITNESS_CODES.index),'problems':[a+': '+b for a,b in problems],'perCommit':verdict['perCommit'],
        'globalCodes':sorted({c for c,_ in problems}-{c for row in verdict['perCommit'] for c in row['codes']},key=n.WITNESS_CODES.index)}

def compare(mode,result,count):
    """Check a judged W1 run against vm_planted_writer; returns a list of mismatches (empty means the mode behaved).
    [EXP-OBS01-R10] Why (F3): the whole refusal is compared, not only the per-commit codes: the complete set of codes the run raised, the
    primary code, the codes that are not per-commit (global problems: UNWITNESSED-WRITE, WITNESS-UNBOUND, CHECKPOINT-UNSYNCED...) and every
    commit's outcome. A positive mode must raise nothing at all; a negative mode must raise exactly its own codes.
    Rejected: judging timing rows only (a FULL-shaped run with a global UNWITNESSED-WRITE compared equal)."""
    mismatches=[];codes=set(result.get('codes') or [])
    rows=result.get('perCommit') or []
    per_commit={c for row in rows for c in row['codes']}
    want_codes=planted.expected_codes(mode);want_global=planted.expected_global(mode);want_primary=planted.expected_primary(mode)
    got_primary=min(codes,key=n.WITNESS_CODES.index) if codes else None
    if result.get('primary')!=got_primary:mismatches.append('reported primary '+str(result.get('primary'))+' is not the primary of the reported codes '+str(got_primary))
    if got_primary!=want_primary:mismatches.append('primary code '+str(got_primary)+' != expected '+str(want_primary))
    if codes!=want_codes:mismatches.append('refusal set '+str(sorted(codes))+' != expected '+str(sorted(want_codes)))
    global_codes=codes-per_commit
    if global_codes!=want_global:mismatches.append('global (not per-commit) codes '+str(sorted(global_codes))+' != expected '+str(sorted(want_global)))
    if mode=='mmap':return mismatches[:10]      # no write records exist for an mmap writer: only the run-level refusal is judged
    if len(rows)!=count:return mismatches+['witnessed commit count '+str(len(rows))+' != '+str(count)]
    for index,row in enumerate(rows,1):
        want=planted.expected(mode,index,count);got=min(row['codes'],key=n.WITNESS_CODES.index) if row['codes'] else None
        if want!=got:mismatches.append('commit '+str(index)+' expected '+str(want)+' got '+str(got))
        if len(mismatches)>=10:break
    return mismatches

def stream_check(trace_path,stderr_text=''):
    """Loss check for traces too large to parse whole (W3). Runs the very same validation state machine as parse_witness (F4): any nonzero
    per-CPU count for a CPU with no records, duplicate or missing B/Z, numeric and timestamp rules, per-CPU sequence/time order and
    error stderr refuse identically. Only the events themselves are not kept."""
    scan=n.WitnessScan(False)
    try:
        with open(trace_path,'r',encoding='utf-8',newline='\n') as handle:
            for number,line in enumerate(handle,1):scan.feed(line[:-1] if line.endswith('\n') else line,number)
    except UnicodeDecodeError:raise n.WitnessError('TRACE-INCOMPLETE','witness output is not UTF-8')
    summary=scan.finish(stderr_text)
    return {'events':summary['eventCount'],'cpus':summary['cpus'],'lostEvents':0,'attachNs':summary['begin']['ts'],'detachNs':summary['end']['ts']}

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
