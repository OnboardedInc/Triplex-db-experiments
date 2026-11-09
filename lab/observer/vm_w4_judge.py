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
import json
from pathlib import Path
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

def read_trace(text):
    """Complete lines of a partial sync-witness/1 trace through the same WitnessScan state machine (no finish(): a crash leaves no Z record and no @n counts)."""
    scan=n.WitnessScan(True);lines=text.split('\n')[:-1]
    for number,line in enumerate(lines,1):scan.feed(line,number)
    if scan.begin is None:raise n.WitnessError('TRACE-INCOMPLETE','no start record in the received trace')
    events=sorted(scan.events,key=lambda e:(e['ts'],e.get('cpu',0),e.get('seq',0)))
    return {'begin':scan.begin,'events':events,'dirs':{(scan.begin['d1'],scan.begin['i1']),(scan.begin['d2'],scan.begin['i2'])},'detached':scan.end is not None,'eventCount':scan.total}

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

def judge_trial(mode,trace_text,stream_text,db_bytes,wal_bytes,cgroup_id):
    stream=read_stream(stream_text);problems=list(stream['problems']);out={'mode':mode,'problems':problems}
    if stream['ready'] is None:problems.append('no R line from the writer');out['pass']=False;return out
    try:trace=read_trace(trace_text)
    except n.WitnessError as error:problems.append(str(error));out['pass']=False;return out
    ready=stream['ready'];dev=n.kernel_dev(ready['dev'])
    if (dev,ready['dir']) not in trace['dirs']:problems.append('the witness was not bound to the writer directory (dev,inode) '+str((dev,ready['dir'])))
    commits=[{'end':a['walEnd'],'U':None,'visible':False,'acks':[]} for a in stream['acks']]
    verdict=n.judge_witness(trace,{'wal':(dev,ready['wal']),'main':(dev,ready['main']),'cgroup':cgroup_id,'walLen':0},commits)
    rows=verdict['perCommit']
    got=survivors(db_bytes,wal_bytes);alive=set(got['lsns'])
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
    """R48 9.1 W4 pass rule: every witnessed commit survives; at least one unwitnessed OFF commit is lost; otherwise the class premise (Q100r) is reopened."""
    full=[t for t in trials if t['mode']=='full'];off=[t for t in trials if t['mode']=='off']
    witnessed_lost=sum(t.get('witnessedLostCount',0) for t in trials);off_lost=sum(t.get('unwitnessedLostCount',0) for t in off)
    reasons=[]
    if len(trials)<required:reasons.append('only '+str(len(trials))+' of '+str(required)+' crash trials completed')
    if not full or not off:reasons.append('both a FULL and an OFF writer are required')
    if any(not t.get('pass') for t in trials):reasons.append('a trial failed its own checks: '+', '.join(str(i+1) for i,t in enumerate(trials) if not t.get('pass')))
    if witnessed_lost:reasons.append(str(witnessed_lost)+' witnessed commit(s) did not survive the guest crash')
    premise=off_lost>0
    if not premise:reasons.append('no unwitnessed OFF commit was lost: the class premise (Q100r) is reopened')
    return {'pass':not reasons,'trials':len(trials),'full':len(full),'off':len(off),'witnessedLost':witnessed_lost,'offUnwitnessedLost':off_lost,
        'fullAckedLost':sum(t.get('ackedLostCount',0) for t in full),'premiseHolds':premise,'reasons':reasons}

if __name__=='__main__':
    if sys.argv[1]=='aggregate':
        print(n.packed(aggregate(json.loads(Path(sys.argv[2]).read_text()))).decode());sys.exit(0)
    directory=Path(sys.argv[1]);mode=sys.argv[2];cgroup=int(sys.argv[3])
    result=judge_trial(mode,(directory/'trace.txt').read_text(),(directory/'writer.txt').read_text(),(directory/'broker.db').read_bytes(),
        (directory/'broker.db-wal').read_bytes() if (directory/'broker.db-wal').exists() else b'',cgroup)
    print(n.packed(result).decode());sys.exit(0 if result['pass'] else 1)
