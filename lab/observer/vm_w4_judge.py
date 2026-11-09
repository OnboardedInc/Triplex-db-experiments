#!/usr/bin/env python3
"""Evaluator-side judge of one W4 trial (guest crash with a planted writer), run on the host after the guest was reset.

Inputs, all collected by the harness on the host (which survives the crash) or read back from the recovered volume:
  trace   the witness's standard output as received before the crash (complete lines only; the last partial line is ignored; no detach record exists)
  stream  the writer's standard output as received before the crash (R| and A| lines, see vm_w4_writer.py)
  db, wal the recovered store files, copied from the volume after the guest came back
Per commit it applies the very same per-commit rule as W1 (vm_normalizer.judge_witness: D = first covering sync of the writer's cgroup) to the partial trace and
compares the commits the witness showed durable with the commits that survived. The claim tested (R48 9.1 W4): every witnessed commit survives, and at least
one unwitnessed OFF commit is lost (otherwise the class premise of Q100r is reopened).
"""
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import sys
import tempfile
import vm_normalizer as n

def read_stream(text):
    """Complete lines only. Returns {'ready':{...}|None,'acks':[{'lsn','atNs','walEnd'}],'problems':[...]}"""
    ready=None;acks=[];problems=[]
    lines=text.split('\n');complete=lines[:-1]       # the text after the last newline is a partial line
    for number,line in enumerate(complete,1):
        parts=line.split('|')
        if parts[0]=='R' and len(parts)==6 and all(p.isdigit() for p in parts[1:]):
            if ready is not None:problems.append('duplicate R line '+str(number))
            else:ready={'pid':int(parts[1]),'dev':int(parts[2]),'wal':int(parts[3]),'main':int(parts[4]),'dir':int(parts[5])}
        elif parts[0]=='A' and len(parts)==4 and all(p.isdigit() for p in parts[1:]):
            lsn=int(parts[1])
            if acks and lsn!=acks[-1]['lsn']+1:problems.append('ACK lsn '+str(lsn)+' after '+str(acks[-1]['lsn'])+' (line '+str(number)+')')
            elif not acks and lsn!=1:problems.append('first ACK is lsn '+str(lsn))
            acks.append({'lsn':lsn,'atNs':int(parts[2]),'walEnd':int(parts[3])})
        elif line.strip():problems.append('unrecognised writer line '+str(number)+': '+line[:60])
    return {'ready':ready,'acks':acks,'problems':problems}

def prefix_problems(scan,stderr=''):
    """[EXP-OBS01-R17] Why (R16-F1): a crash justifies a missing SUFFIX (no detach record, no final counters, a cut last line); it never justifies a hole INSIDE what was received. WitnessScan.feed checks the
    grammar line by line but the sequence, order and attach-bound rules live in finish(), which a crashed trace cannot call. This is the prefix form of those rules: every CPU's sequence numbers are exactly
    1..max with nondecreasing timestamps, nothing happened before the attach record, and the witness's own stderr reports no lost events or errors. A trace that fails any of them is refused (TRACE-INCOMPLETE):
    a sync record that fell into a hole could belong to a witnessed commit, so neither a loss nor a survival can be judged from it. Rejected: sorting the events by time and judging the survivors (the first version: a lost
    sync at sequence 40 turned a witnessed lost commit into an unwitnessed tail); requiring the END record and final counters (a crash removes them by definition)."""
    problems=[]
    for cpu,bucket in sorted(scan.cpus.items()):
        if len(bucket)!=max(bucket):
            missing=sorted(set(range(1,max(bucket)+1))-set(bucket))[:5]
            problems.append('lost events: CPU '+str(cpu)+' sequence gap inside the received trace (missing '+str(missing)+')')
        ordered=[bucket[seq] for seq in sorted(bucket)]
        if any(x>y for x,y in zip(ordered,ordered[1:])):problems.append('CPU '+str(cpu)+' time regressed within its sequence')
    if scan.low is not None and scan.begin is not None and scan.low<scan.begin['ts']:problems.append('event before attach')
    for line in str(stderr).splitlines():
        found=re.search(r'\blost\s+([0-9]+)\s+events?\b',line,re.I)
        if found and int(found[1])>0:problems.append('bpftrace reported lost events: '+line[:80])
        elif re.match(r'\s*(error|fatal)\b',line,re.I):problems.append('bpftrace error output: '+line[:80])
    return problems

def read_trace(text,stderr=''):
    """Complete lines of a partial sync-witness/1 trace through the same WitnessScan state machine, then the prefix rules above (no finish(): a crash leaves no Z record and no @n counts)."""
    scan=n.WitnessScan(True);lines=text.split('\n')[:-1]
    for number,line in enumerate(lines,1):scan.feed(line,number)
    if scan.begin is None:raise n.WitnessError('TRACE-INCOMPLETE','no start record in the received trace')
    bad=prefix_problems(scan,stderr)
    if bad:raise n.WitnessError('TRACE-INCOMPLETE','; '.join(bad[:4]))
    events=sorted(scan.events,key=lambda e:(e['ts'],e.get('cpu',0),e.get('seq',0)))
    return {'begin':scan.begin,'events':events,'dirs':{(scan.begin['d1'],scan.begin['i1']),(scan.begin['d2'],scan.begin['i2'])},'detached':scan.end is not None,'eventCount':scan.total}

STORE_FILES=('broker.db','broker.db-wal')
def verify_collection(collection,files):
    """[EXP-OBS01-R17] Why (R16-F2): the store files are copied out of the recovered volume by `docker cp`, which can fail or stop short. A file that is missing or short locally is NOT the same as a file the crash
    removed, and a missing WAL turns every OFF commit into a 'loss'. The harness therefore records a receipt FROM THE RECOVERED VOLUME ITSELF (the listing, and the size and sha256 of every store file, produced by a
    container that mounts the volume read-only) and the copy status of each file; this function accepts the copies only if every file the receipt lists was copied cleanly and has exactly the receipted size and sha256, and
    accepts the absence of a file only if the receipt's listing, taken from the same volume, shows it absent. The seeded main database must always exist. Returns (ok, code, detail, walAbsent).
    Rejected: treating `no local WAL` as proof that the volume had none; trusting the copy exit status alone (a truncated copy exits 0 on some failures)."""
    if not isinstance(collection,dict) or collection.get('format')!='w4-collection/1':return False,'COLLECTION-RECEIPT-INVALID','no collection record (w4-collection/1)',False
    receipt=collection.get('receipt')
    if not isinstance(receipt,dict) or receipt.get('format')!='w4-receipt/1' or not isinstance(receipt.get('files'),dict) or not isinstance(receipt.get('listing'),list):
        return False,'COLLECTION-RECEIPT-INVALID','the recovered volume gave no valid receipt ('+str(collection.get('receiptError'))+')',False
    copy=collection.get('copy') if isinstance(collection.get('copy'),dict) else {}
    wal_absent=False
    for name in STORE_FILES:
        local=files.get(name);listed=name in receipt['listing'];row=receipt['files'].get(name)
        if (row is not None)!=listed:return False,'COLLECTION-RECEIPT-INVALID',name+' is in the receipt listing but has no size/hash row, or the reverse',False
        if not listed:
            if name=='broker.db':return False,'COPY-FAILED','the seeded main database is absent from the recovered volume',False
            if local is not None and len(local):return False,'COPY-INCOMPLETE',name+' was copied although the receipt shows it absent',False
            wal_absent=True;continue
        if copy.get(name) is not True or local is None:return False,'COPY-FAILED',name+' is on the recovered volume ('+str(row.get('size'))+' bytes) but its copy failed or is missing',False
        if not isinstance(row.get('size'),int) or not isinstance(row.get('sha256'),str):return False,'COLLECTION-RECEIPT-INVALID',name+' receipt row malformed',False
        if len(local)!=row['size']:return False,'COPY-INCOMPLETE',name+' copy has '+str(len(local))+' bytes, the volume has '+str(row['size']),False
        if hashlib.sha256(local).hexdigest()!=row['sha256']:return False,'COPY-INCOMPLETE',name+' copy sha256 differs from the volume\'s',False
    return True,None,None,wal_absent

def survivors(db_bytes,wal_bytes):
    """LSNs present in the recovered database. SQLite replays the valid prefix of the WAL on open, on a private copy here (the evidence files stay untouched)."""
    with tempfile.TemporaryDirectory() as directory:
        main=Path(directory)/'broker.db';main.write_bytes(db_bytes)
        if wal_bytes:(Path(directory)/'broker.db-wal').write_bytes(wal_bytes)
        connection=sqlite3.connect('file:'+str(main)+'?mode=rw',uri=True)
        try:
            lsns=[row[0] for row in connection.execute('SELECT lsn FROM frames ORDER BY lsn')]
            marker=connection.execute('SELECT lsn FROM marker').fetchone()
        finally:connection.close()
    return {'lsns':lsns,'marker':marker[0] if marker else None}

def judge_trial(mode,trace_text,stream_text,db_bytes,wal_bytes,cgroup_id,collection=None,witness_stderr=''):
    """Judges one trial. A trace with an internal gap or a store copy that was not verified REFUSES (out['refusal'] is a code, out['pass'] is False, and NO count is reported): such a trial is evidence neither
    that commits survived nor that they were lost. `collection` is the harness's collection record (verify_collection); without it only non-empty store bytes handed in directly are accepted (the pure-judge tests),
    an empty WAL never is (an unproven absence), and the trial is marked collection 'unverified' so aggregate() refuses it."""
    stream=read_stream(stream_text);problems=list(stream['problems']);out={'mode':mode,'problems':problems}
    def refuse(code,detail):
        problems.append(code+': '+detail);out.update({'pass':False,'refusal':code});return out
    if collection is not None:
        ok,code,detail,wal_absent=verify_collection(collection,{'broker.db':db_bytes or None,'broker.db-wal':wal_bytes or None})
        if not ok:return refuse(code,detail)
        out['collection']='verified';out['walAbsentConfirmed']=wal_absent
    elif not wal_bytes:return refuse('WAL-ABSENCE-UNPROVEN','no WAL bytes and no collection receipt showing the WAL absent on the recovered volume')
    if not db_bytes:return refuse('COPY-FAILED','no main database bytes')
    if stream['ready'] is None:problems.append('no R line from the writer');out['pass']=False;return out
    try:trace=read_trace(trace_text,witness_stderr)
    except n.WitnessError as error:return refuse(error.code,str(error))
    ready=stream['ready'];dev=n.kernel_dev(ready['dev'])
    if (dev,ready['dir']) not in trace['dirs']:problems.append('the witness was not bound to the writer directory (dev,inode) '+str((dev,ready['dir'])))
    commits=[{'end':a['walEnd'],'U':None,'visible':False,'acks':[]} for a in stream['acks']]
    verdict=n.judge_witness(trace,{'wal':(dev,ready['wal']),'main':(dev,ready['main']),'cgroup':cgroup_id,'walLen':0},commits)
    rows=verdict['perCommit']
    got=survivors(db_bytes,wal_bytes or b'');alive=set(got['lsns'])
    witnessed=[a['lsn'] for a,r in zip(stream['acks'],rows) if r['D'] is not None]
    acked=[a['lsn'] for a in stream['acks']]
    out.update({'acked':len(acked),'lastAcked':acked[-1] if acked else 0,'witnessed':len(witnessed),'survived':len(alive),'lastSurvived':max(alive) if alive else 0,'marker':got['marker'],
        'witnessedLost':[l for l in witnessed if l not in alive][:20],'witnessedLostCount':sum(1 for l in witnessed if l not in alive),
        'ackedLostCount':sum(1 for l in acked if l not in alive),'unwitnessedAcked':len(acked)-len(witnessed),
        'unwitnessedLostCount':sum(1 for a,r in zip(stream['acks'],rows) if r['D'] is None and a['lsn'] not in alive),
        'syncsCredited':verdict['syncsCredited'],'traceEvents':trace['eventCount'],'traceDetached':trace['detached'],'witnessProblems':[a+': '+b for a,b in verdict['problems']]})
    if mode=='full':
        # FULL: every commit has a covering sync in the trace once the writer got far enough; the witness can lag the writer at the very end (events still in flight to the host)
        out['pass']=out['witnessedLostCount']==0 and out['witnessed']>0 and not problems
    else:
        # OFF: no commit may be witnessed; the loss of acknowledged commits is the observation, judged across trials
        out['pass']=out['witnessedLostCount']==0 and out['witnessed']==0 and not problems
    return out

def aggregate(trials,required=10):
    """R48 9.1 W4 pass rule: every witnessed commit survives; at least one unwitnessed OFF commit is lost; otherwise the class premise (Q100r) is reopened.
    [EXP-OBS01-R17] A refused trial (internal trace gap, unverified or failed store copy) is listed and fails the aggregate; it contributes to no count, so a collection failure can never supply the required OFF loss;
    and every trial must carry a verified collection record."""
    full=[t for t in trials if t['mode']=='full' and not t.get('refusal')];off=[t for t in trials if t['mode']=='off' and not t.get('refusal')]
    counted=full+off
    witnessed_lost=sum(t.get('witnessedLostCount',0) for t in counted);off_lost=sum(t.get('unwitnessedLostCount',0) for t in off)
    reasons=[]
    refused=[(i+1,t['refusal']) for i,t in enumerate(trials) if t.get('refusal')]
    if refused:reasons.append('refused trial(s), counted as no evidence either way: '+', '.join('#'+str(i)+' '+c for i,c in refused))
    if len(counted)<required:reasons.append('only '+str(len(counted))+' of '+str(required)+' crash trials gave evidence')
    if not full or not off:reasons.append('both a FULL and an OFF writer are required')
    unverified=[i+1 for i,t in enumerate(trials) if not t.get('refusal') and t.get('collection')!='verified']
    if unverified:reasons.append('trial(s) without a verified store collection record: '+', '.join(str(i) for i in unverified))
    if any(not t.get('pass') and not t.get('refusal') for t in trials):reasons.append('a trial failed its own checks: '+', '.join(str(i+1) for i,t in enumerate(trials) if not t.get('pass') and not t.get('refusal')))
    if witnessed_lost:reasons.append(str(witnessed_lost)+' witnessed commit(s) did not survive the guest crash')
    premise=off_lost>0
    if not premise:reasons.append('no unwitnessed OFF commit was lost: the class premise (Q100r) is reopened')
    return {'pass':not reasons,'trials':len(trials),'counted':len(counted),'refused':len(refused),'full':len(full),'off':len(off),'witnessedLost':witnessed_lost,'offUnwitnessedLost':off_lost,
        'fullAckedLost':sum(t.get('ackedLostCount',0) for t in full),'premiseHolds':premise,'reasons':reasons}

if __name__=='__main__':
    if sys.argv[1]=='aggregate':
        print(n.packed(aggregate(json.loads(Path(sys.argv[2]).read_text()))).decode());sys.exit(0)
    directory=Path(sys.argv[1]);mode=sys.argv[2];cgroup=int(sys.argv[3])
    def maybe(name):return (directory/name).read_bytes() if (directory/name).exists() else None
    collection=json.loads((directory/'collection.json').read_text()) if (directory/'collection.json').exists() else None
    stderr_file=directory/'witness-stderr.txt'
    if collection is None or not stderr_file.exists():
        result={'mode':mode,'pass':False,'refusal':'COLLECTION-RECEIPT-INVALID' if collection is None else 'TRACE-INCOMPLETE','collection':'unverified',
            'problems':['collection.json is required' if collection is None else 'the witness stderr capture (witness-stderr.txt) is required']}
    else:
        result=judge_trial(mode,(directory/'trace.txt').read_text(),(directory/'writer.txt').read_text(),maybe('broker.db'),maybe('broker.db-wal'),cgroup,collection,stderr_file.read_text())
    print(n.packed(result).decode());sys.exit(0 if result['pass'] else 1)
