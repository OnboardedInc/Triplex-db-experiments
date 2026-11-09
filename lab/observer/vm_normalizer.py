#!/usr/bin/env python3
"""OBS01-R6: standalone evaluator parser, no candidate imports or candidate timestamps as evidence."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import struct
import sys
import tempfile


def packed(value): return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()
def sha(value): return hashlib.sha256(value).hexdigest()
def blob(value): return {'base64':base64.b64encode(value).decode(),'sha256':sha(value)}
def unblob(value):
    raw=base64.b64decode(value['base64'],validate=True)
    if sha(raw)!=value['sha256']:raise ValueError('raw object hash mismatch')
    return raw

def domain(boot, offsets, inode=None):
    if not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',boot.strip()):raise ValueError('invalid boot id')
    rows={}
    for line in offsets.splitlines():
        name,secs,nsecs=line.split()
        if name in rows:raise ValueError('duplicate time offset')
        rows[name]=[int(secs),int(nsecs)]
    if rows!={'monotonic':[0,0],'boottime':[0,0]}:raise ValueError('Q100q nonzero/unknown time offsets')
    return {'bootId':boot.strip(),'primitive':'CLOCK_MONOTONIC','offsets':rows,'timeNsInode':inode}

def same_domain(records):
    identities=[]
    for record in records:
        checked=domain(record['bootId'],'\n'.join(name+' '+str(v[0])+' '+str(v[1]) for name,v in record['offsets'].items()),record.get('timeNsInode'))
        identities.append(checked['bootId'])
    if not identities or len(set(identities))!=1:raise ValueError('Q100q clock domain mismatch')
    return identities[0]

SQL01={'marker':['id','lsn','epoch','h','position','crc','size'],
       'frames':['lsn','epoch','kind','offset','end','prev_crc','crc','payload','committed_at']}
FD01={'checkpoints':['consumer','source','token'],'frontier':['consumer','stream','epoch','offset'],
      'deliveries':['consumer','stream','epoch','offset','digest'],'effects':['consumer','epoch','position','subject'],
      'affected':['consumer','epoch','position','subject']}
COLUMNS=['id','entity_id','attribute','value_type','value_string','value_number','value_boolean','value_datetime','value_json','recorded_at','recorded_position','valid_from','valid_to','created_by','retracted_at','retracted_position','retract_tx_id','entity_type','schema_version','tx_id']

def readonly(path):
    connection=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True,timeout=0)
    connection.execute('PRAGMA query_only=ON')
    return connection

def schema(connection, profile):
    expected=SQL01 if profile=='sql01' else FD01 if profile=='fd01' else None
    if expected is None:raise ValueError('unknown evaluator schema')
    for table,columns in expected.items():
        if [row[1] for row in connection.execute('PRAGMA table_info('+table+')')]!=columns:
            raise ValueError('schema differs from pinned '+profile+': '+table)
    return expected

def read_state(connection, profile):
    expected=schema(connection,profile)
    result={}
    for table,columns in expected.items():
        rows=connection.execute('SELECT '+','.join('"'+c+'"' for c in columns)+' FROM '+table+' ORDER BY '+','.join('"'+c+'"' for c in columns)).fetchall()
        result[table]=[dict(zip(columns,[blob(v) if isinstance(v,bytes) else v for v in row])) for row in rows]
    if profile=='sql01':
        if len(result['marker'])!=1 or result['marker'][0]['id']!=1:raise ValueError('missing/duplicate marker')
        previous=None
        for frame in result['frames']:
            payload=unblob(frame['payload'])
            if previous and (frame['lsn']<=previous['lsn'] or frame['prev_crc']!=previous['crc'] or frame['offset']!=previous['end']):raise ValueError('SQL01 chain mismatch')
            if frame['end']-frame['offset']!=len(payload)+36:raise ValueError('SQL01 frame length')
            header=struct.pack('<IIQIIHH',0x464c5854,len(payload),frame['lsn'],frame['epoch'],frame['prev_crc'],frame['kind'],0)
            crc=crc32c(payload,crc32c(header,frame['prev_crc']))
            if crc!=frame['crc']:raise ValueError('SQL01 frame CRC mismatch')
            if frame['kind']==1:
                wire=json.loads(payload)
                if wire['v']!=1 or wire['l']!=frame['lsn'] or wire['e']!=frame['epoch']:raise ValueError('SQL01 payload binding')
                members=[]
                for member in wire['m']:
                    if not member['p'] or member['p']!=sorted(set(member['p'])):raise ValueError('SQL01 position order')
                    if any(type(p) is not int or p//1024!=frame['lsn'] for p in member['p']):raise ValueError('SQL01 packed position binding')
                    if any(len(row)!=len(COLUMNS) for row in member['r']+member['b']):raise ValueError('SQL01 row codec')
                    members.append({'operationId':member['o'],'attemptId':member['a'],'positions':member['p'],
                        'claims':member['c'],'rows':[dict(zip(COLUMNS,row)) for row in member['r']],
                        'priors':[dict(zip(COLUMNS,row)) for row in member['b']],'subjects':member['s']})
                frame['decoded']={'stream':wire['s'],'members':members}
            previous=frame
        marker=result['marker'][0]
        if previous and any(marker[field]!=previous[field] for field in ('lsn','epoch','crc')):raise ValueError('SQL01 marker/frame binding')
    return result

def crc32c(raw,seed=0):
    crc=seed^0xffffffff
    for byte in raw:
        crc^=byte
        for _ in range(8):crc=(crc>>1)^ (0x82f63b78 if crc&1 else 0)
    return crc^0xffffffff

def wal_commits(raw):
    if not raw:return []
    if len(raw)<32 or raw[:4] not in (b'7\x7f\x06\x82',b'7\x7f\x06\x83'):raise ValueError('invalid WAL header')
    if int.from_bytes(raw[4:8],'big')!=3007000:raise ValueError('unsupported WAL version')
    size=int.from_bytes(raw[8:12],'big');order='little' if raw[3]==0x82 else 'big'
    if size<512 or size>65536 or size&(size-1) or (len(raw)-32)%(size+24):raise ValueError('partial WAL tail; NOT_ESTIMABLE')
    def checksum(data,pair):
        a,b=pair
        for at in range(0,len(data),8):
            a=(a+int.from_bytes(data[at:at+4],order)+b)&0xffffffff
            b=(b+int.from_bytes(data[at+4:at+8],order)+a)&0xffffffff
        return a,b
    pair=checksum(raw[:24],(0,0))
    if pair!=struct.unpack('>II',raw[24:32]):raise ValueError('WAL header checksum')
    commits=[]
    for at in range(32,len(raw),size+24):
        header=raw[at:at+24];body=raw[at+24:at+24+size]
        if header[8:16]!=raw[16:24] or not int.from_bytes(header[:4],'big'):raise ValueError('WAL generation/page mismatch')
        pair=checksum(header[:8]+body,pair)
        if pair!=struct.unpack('>II',header[16:24]):raise ValueError('WAL frame checksum')
        if int.from_bytes(header[4:8],'big'):commits.append(at+24+size)
    return commits

def snapshot(main,wal,profile):
    with tempfile.TemporaryDirectory(prefix='obs01-readback-') as temporary:
        file=Path(temporary)/'copy.db';file.write_bytes(main)
        if wal:Path(str(file)+'-wal').write_bytes(wal)
        connection=readonly(file)
        try:
            if connection.execute('PRAGMA integrity_check').fetchall()!=[('ok',)]:raise ValueError('SQLite readback integrity')
            return read_state(connection,profile)
        finally:connection.close()

def history(main,wal,profile):
    previous=snapshot(main,b'',profile);result=[]
    for end in wal_commits(wal):
        state=snapshot(main,wal[:end],profile);added={};deleted={}
        for table in state:
            old={packed(row):row for row in previous[table]};new={packed(row):row for row in state[table]}
            added[table]=[new[key] for key in sorted(new.keys()-old.keys())]
            deleted[table]=[old[key] for key in sorted(old.keys()-new.keys())]
        result.append({'walEnd':end,'stateSha256':sha(packed(state)),'added':added,'deleted':deleted})
        previous=state
    return result,previous

def brackets(polls):
    result=[];previous=None;gaps=[];costs=[]
    for seq,poll in enumerate(polls):
        start,end,value=poll['startNs'],poll['endNs'],tuple(poll['visible'])
        if any(type(n) is not int or n<0 for n in (start,end,*value)) or start>end:raise ValueError('invalid poll')
        costs.append(end-start)
        if previous:
            if start<previous['endNs'] or value<tuple(previous['visible']):raise ValueError('poll clock/frontier regressed')
            gaps.append(start-previous['startNs'])
            if value>tuple(previous['visible']):result.append({'after':previous['visible'],'through':list(value),'L':previous['startNs'],'U':end,'lowerPoll':seq-1,'upperPoll':seq})
        previous=poll
    if len(polls)<2:raise ValueError('publication bracket lacks negative/positive observations')
    return {'intervals':result,'requestedPeriodNs':250000,'measuredMaxPeriodNs':max(gaps)+max(costs),
        'periodsNs':gaps,'pollCostsNs':costs}

def bracket_for(summary,position):
    matches=[v for v in summary['intervals'] if tuple(v['after'])<tuple(position)<=tuple(v['through'])]
    if len(matches)!=1:raise ValueError('position missing unique publication bracket')
    return matches[0]

def crosscheck(summary,stamps):
    for stamp in stamps:
        bracket=bracket_for(summary,stamp['position'])
        if not bracket['L']-1000000<=stamp['atNs']<=bracket['U']+5000000:raise ValueError('F20 CR-INCONSISTENT')

def normalize(raw):
    frames=[json.loads(line) for line in raw.splitlines()];events=[];binding=None;last=-1
    for frame in frames:
        identity=tuple(frame[k] for k in ('runId','sourceId','engineContainerId','caseSha256'))
        if binding is not None and identity!=binding:raise ValueError('raw frame binding mismatch')
        binding=identity
        if frame['tStartMono']<last or frame['tStartMono']>frame['tEndMono']:raise ValueError('raw frame time order')
        last=frame['tEndMono'];payload=base64.b64decode(frame['rawBase64'],validate=True)
        if sha(payload)!=frame['rawSha256']:raise ValueError('raw source SHA mismatch')
        event=json.loads(payload)
        if event['runId']!=frame['runId']:raise ValueError('event run mismatch')
        if event['event']=='polls':
            for poll in event['polls']:
                if poll['source']!=event['source']:raise ValueError('poll batch source mismatch')
                events.append({'runId':event['runId'],**poll})
        else:events.append(event)
    if not events:raise ValueError('empty observer stream')
    case=events[0]
    if case['event']!='begin' or sha(packed(case['case']))!=binding[3]:raise ValueError('case/source binding')
    if events[-1]['event']!='end':raise ValueError('observer stream incomplete')
    mode=case['case'].get('clockMode')
    if mode not in ('vm','offline-synthetic'):raise ValueError('unbound source clock mode')
    lower=case['case']['startedNs'];upper=events[-1]['atNs']
    if mode=='vm':
        lower=max(lower,int(frames[0]['runStartedMono']*1000000)-1000)
        if upper>int(frames[-1]['tEndMono']*1000000)+1000:raise ValueError('future source end')
    for event in events:
        if event['event']=='poll' and not lower<=event['startNs']<=event['endNs']<=upper:raise ValueError('stale/future poll observation')
    clocks=[e for e in events if e['event']=='domain']
    if {e['role'] for e in clocks} != {'observer',*case['case'].get('clockPids',{})} or len(clocks)!=1+len(case['case'].get('clockPids',{})):
        raise ValueError('missing/duplicate process clock record')
    same_domain([e['domain'] for e in clocks])
    if any(e['event']=='error' for e in events):raise ValueError('collector error; NOT_ESTIMABLE')
    ids=[s['id'] for s in case['case']['sources']]
    if len(ids)!=len(set(ids)) or any(e.get('source') is not None and e['source'] not in ids for e in events):raise ValueError('source inventory binding')
    result={'format':'obs-vm-publication/1','runId':binding[0],'sourceId':binding[1],'clockMode':mode,'stores':{},'noise':[], 'gone':[],
            'claim':'observer readbacks and intervals only; no NS semantic PASS'}
    for source in case['case']['sources']:
        sid=source['id'];selected=[e for e in events if e.get('source')==sid]
        polls=[e for e in selected if e['event']=='poll'];summary=brackets(polls)
        captured=b''
        for event in selected:
            if event['event']=='wal':
                chunk=unblob(event['bytes'])
                if event['offset']!=len(captured):raise ValueError('F11 missing/reset WAL generation')
                captured+=chunk
            if event['event']=='error':raise ValueError(event['reason'])
        finals=[e for e in selected if e['event']=='final']
        if len(finals)!=1:raise ValueError('missing/duplicate final readback')
        final=finals[0];main=unblob(final['main']);wal=unblob(final['wal'])
        if captured!=wal:raise ValueError('F11 TAMPER final WAL differs from tailed bytes')
        transactions,state=history(main,wal,source['profile'])
        if source['profile']=='sql01':
            marker=state['marker'][0];through=[marker['epoch'],marker['lsn']]
        else:
            rows=[row for row in state['frontier'] if row['consumer']==source['consumer']]
            if len(rows)>1:raise ValueError('duplicate consumer frontier')
            through=[int(rows[0]['epoch']),int(rows[0]['offset'])+1] if rows else [0,0]
            if rows and any(p.get('stream') is not None and p['stream']!=rows[0]['stream'] for p in polls):raise ValueError('consumer stream binding changed')
        if tuple(through)<tuple(polls[-1]['visible']):raise ValueError('final readback behind witnessed publication')
        crosscheck(summary,final.get('cr',[]))
        if source['profile']=='sql01':
            wall=[e for e in events if e['event']=='clock-wall']
            if len(wall)<2:raise ValueError('SQL01 CR wall-clock correlation missing')
            bounds=[(e['realNs']-e['upperNs'],e['realNs']-e['lowerNs']) for e in wall]
            if any(e['lowerNs']>e['upperNs'] for e in wall) or max(b[1] for b in bounds)-min(b[0] for b in bounds)>1000000:
                raise ValueError('SQL01 CR realtime clock step/uncertainty')
            offset_low=min(b[0] for b in bounds);offset_high=max(b[1] for b in bounds)
            for row in state['frames']:
                if row['lsn']<=polls[0]['visible'][1]:continue
                interval=bracket_for(summary,[row['epoch'],row['lsn']])
                low=row['committed_at']*1000000-offset_high;high=(row['committed_at']+1)*1000000-offset_low
                if high<interval['L']-1000000 or low>interval['U']+5000000:raise ValueError('F20 CR-INCONSISTENT SQL01 committed_at')
        if source['profile']=='sql01':
            positions=[]
            for row in state['frames']:
                if row['lsn']<=polls[0]['visible'][1]:continue
                interval=bracket_for(summary,[row['epoch'],row['lsn']])
                for member in row.get('decoded',{}).get('members',[]):
                    positions.extend({'position':p,'lsn':row['lsn'],'epoch':row['epoch'],'L':interval['L'],'U':interval['U']} for p in member['positions'])
        else:
            positions=[]
            for transaction in transactions:
                frontiers=[row for row in transaction['added']['frontier'] if row['consumer']==source['consumer']]
                affected=[row for row in transaction['added']['affected'] if row['consumer']==source['consumer']]
                if affected and len(frontiers)!=1:raise ValueError('FD01 affected/checkpoint transaction lacks unique frontier')
                if frontiers:
                    frontier=frontiers[0];interval=bracket_for(summary,[int(frontier['epoch']),int(frontier['offset'])+1])
                    positions.extend({**row,'L':interval['L'],'U':interval['U'],'frontier':frontier} for row in affected)
        result['stores'][sid]={'publication':summary,'positions':positions,'state':state,'transactions':transactions,
            'mainSha256':sha(main),'walSha256':sha(wal)}
    seen={}
    for event in events:
        if event['event']=='noise':result['noise'].append(event)
        if event['event']=='cgroup-seen':seen[event['containerId']]=event
        if event['event']=='cgroup-gone':
            prior=seen.get(event['containerId'])
            if not prior or not event['selfVisible'] or prior['path']!=event['path'] or prior['atNs']>=event['atNs']:raise ValueError('cgroup-gone without initial bound visibility')
            result['gone'].append(event)
    if set(case['case'].get('cgroups',[])) != {e['containerId'] for e in result['gone']}:raise ValueError('long-lived cgroup-gone proofs incomplete')
    return result

if __name__=='__main__':
    try:print(packed(normalize(sys.stdin.buffer.read())).decode())
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(2)
