#!/usr/bin/env python3
"""OBS01-R6: standalone evaluator parser, no candidate imports or candidate timestamps as evidence."""
import base64
import bisect
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

# [EXP-OBS01-R7] Why: Q100s classifies the pinned SQL01 field by source semantics.
# Rejected: a candidate-supplied kind that could weaken publication checks.
STAMP_KINDS={'sql01.frames.committed_at':'decision','observer.cr.atNs':'publication'}

def stamp_window(field,bracket,send_ns=None):
    kind=STAMP_KINDS[field]
    if kind=='decision':
        if type(send_ns) is not int or send_ns<0:raise ValueError('F20 decision stamp missing driver send')
        if send_ns>bracket['U']:raise ValueError('F20 driver send after publication U')
        return send_ns,bracket['U']+5000000
    return bracket['L']-1000000,bracket['U']+5000000

def decision_send(events,source,row,clocks,lower,upper):
    members=row.get('decoded',{}).get('members',[])
    if not members:raise ValueError('F20 decision stamp lacks offer binding')
    sends=[]
    for member in members:
        offers=[event for event in events if event['event']=='driver-send' and
            (event.get('source'),event.get('stream'),event.get('operationId'),event.get('attemptId'))==
            (source['id'],row['decoded']['stream'],member['operationId'],member['attemptId'])]
        if len(offers)!=1:raise ValueError('F20 missing/duplicate driver offer send')
        offer=offers[0];at=offer['atNs']
        if type(at) is not int or not lower<=at<=upper:raise ValueError('F20 stale/future driver send')
        same_domain([clocks[0]['domain'],offer['domain']])
        sends.append(at)
    return max(sends)

def crosscheck(summary,stamps):
    for stamp in stamps:
        bracket=bracket_for(summary,stamp['position'])
        lo,hi=stamp_window('observer.cr.atNs',bracket)
        if not lo<=stamp['atNs']<=hi:raise ValueError('F20 CR-INCONSISTENT')


def file_identity(events):
    bound={}
    observations=[e for e in events if e['event'] in ('poll','wal','final')]
    for event in sorted(observations,key=lambda e:e.get('endNs',e.get('atNs',0))):
        files=event.get('files')
        if not isinstance(files,dict) or set(files)!={'main','-wal','-shm'} or files['main'] is None:raise ValueError('F1 missing physical file binding')
        for name,value in files.items():
            if value is not None and (not isinstance(value,list) or len(value)!=2 or any(type(v) is not int or v<0 for v in value)):raise ValueError('F1 invalid file identity')
            if name in bound and value!=bound[name]:raise ValueError('F1 file identity changed')
            if value is not None:bound[name]=value
    return bound

def durability_state(source,mode):
    # [EXP-OBS01-R8] Why: synchronous is connection-local, not recoverable from SQLite bytes.
    # Rejected: treating the observer RO PRAGMA or candidate config as writer sync proof.
    state=source.get('writerState',{})
    if mode!='offline-synthetic':raise ValueError('F2 durable publication needs independent writer/VFS sync enforcement; visibility only')
    if state.get('scope')!='evaluator-offline-fixture' or state.get('pragmas')!={'journal_mode':'wal','synchronous':2}:raise ValueError('F2 missing/non-FULL pinned writer state')
    if not isinstance(state.get('sqliteVersion'),str) or not state['sqliteVersion']:raise ValueError('F2 writer implementation missing')
    return state

# ---- OBS01-R9: kernel sync witness (sync-witness/1) -------------------------------------------------------------------
# [EXP-OBS01-R9] Why: P2/P3 durability is believed only when the kernel witnessed the writer's own sync (R48, Q108a/b). The
# candidate's PRAGMA, SQLite build and config are never evidence. This block lives in the single pinned normalizer file because
# O-OBS reruns it alone (python -I); a sibling module would not be covered by the stream's sha256 pin.
# Rejected: a separate parser module (unpinned), trusting bpftrace stderr for loss (per-CPU sequence gaps are machine-checkable).
WITNESS_CODES=('TRACE-INCOMPLETE','WITNESS-UNBOUND','UNWITNESSED-WRITE','CHECKPOINT-UNSYNCED','SYNC-MISSING','ACK-BEFORE-DURABLE','VISIBLE-BEFORE-DURABLE')

class WitnessError(ValueError):
    """Refusal with one of the seven R48 8.3 codes; the message keeps the round-8 'F2' prefix so older gates still match."""
    def __init__(self,code,detail,also=()):
        if code not in WITNESS_CODES:raise ValueError('unknown witness code')
        self.code=code;self.also=tuple(c for c in WITNESS_CODES if c in also and c!=code)
        super().__init__('F2 '+code+': '+detail+(' (also '+', '.join(self.also)+')' if self.also else ''))

def kernel_dev(st_dev):
    # glibc st_dev -> kernel dev_t (MKDEV: major<<20|minor), the encoding of tracepoint dev fields and super_block.s_dev
    major=((st_dev>>8)&0xfff)|((st_dev>>32)&~0xfff);minor=(st_dev&0xff)|((st_dev>>12)&~0xff)
    return (major<<20)|minor

SW_LAYOUT={'B':'ts d1 i1 d2 i2','Z':'ts','W':'cpu seq ts cg dev ino parent off ret','M':'cpu seq ts cg dev ino parent',
    'F':'cpu seq enter ts cg dev ino parent datasync ret','S':'cpu seq enter ts cg dev wait ret','T':'cpu seq ts cg dev ino op off len'}
SW_SIGNED={'ret'}
_UNSIGNED=re.compile(r'[0-9]{1,19}');_SIGNED=re.compile(r'-?[0-9]{1,19}')

def _bad(detail):raise WitnessError('TRACE-INCOMPLETE',detail)

def parse_witness(text,stderr=''):
    """Strict parser for the bpftrace output of vm_syncwitness.bt. Anything unparseable, duplicated, regressed or lost refuses."""
    if not isinstance(text,str) or not isinstance(stderr,str):_bad('trace is not text')
    begin=end=None;events=[];counts={};per_cpu={}
    for number,line in enumerate(text.split('\n'),1):
        if not line.strip():continue
        if len(line)>300 or line!=line.strip() or not line.isascii() or not line.isprintable():_bad('line '+str(number)+' malformed')
        if line.startswith('@n['):
            match=re.fullmatch(r'@n\[([0-9]{1,5})\]: ([0-9]{1,19})',line)
            if not match or end is None or int(match[1]) in counts:_bad('line '+str(number)+' bad/duplicate per-CPU count')
            counts[int(match[1])]=int(match[2]);continue
        parts=line.split('|')
        if parts[0]!='SW1' or len(parts)<3 or parts[1] not in SW_LAYOUT:_bad('line '+str(number)+' unknown record')
        kind=parts[1];names=SW_LAYOUT[kind].split()
        if len(parts)-2!=len(names):_bad('line '+str(number)+' field count')
        record={'k':kind}
        for name,value in zip(names,parts[2:]):
            if name=='op':
                if value not in ('t','p','z'):_bad('line '+str(number)+' bad op')
                record[name]=value;continue
            if not (_SIGNED if name in SW_SIGNED else _UNSIGNED).fullmatch(value):_bad('line '+str(number)+' bad number '+name)
            record[name]=int(value)
        if end is not None:_bad('record after detach')
        if kind=='B':
            if begin is not None or events:_bad('missing/duplicate/late start record')
            begin=record;continue
        if begin is None:_bad('record before start record')
        if kind=='Z':end=record;continue
        if record['cpu']>4095 or record['seq']<1:_bad('line '+str(number)+' cpu/seq range')
        if kind in ('F','S') and record['enter']>record['ts']:_bad('line '+str(number)+' enter after exit')
        if record['k']=='F' and record['datasync'] not in (0,1):_bad('line '+str(number)+' datasync')
        if record['k']=='S' and record['wait'] not in (0,1):_bad('line '+str(number)+' wait')
        key=(record['cpu'],record['seq'])
        if key in per_cpu:_bad('duplicate record cpu '+str(key[0])+' seq '+str(key[1]))
        per_cpu[key]=record;events.append(record)
    if begin is None:_bad('missing start record')
    if end is None:_bad('missing detach record')
    by_cpu={}
    for (cpu,seq),record in per_cpu.items():by_cpu.setdefault(cpu,[]).append((seq,record))
    for cpu,rows in by_cpu.items():
        rows.sort(key=lambda row:row[0])
        if [seq for seq,_ in rows]!=list(range(1,len(rows)+1)):_bad('lost events: CPU '+str(cpu)+' sequence gap')
        if counts.get(cpu)!=len(rows):_bad('lost events: CPU '+str(cpu)+' count '+str(counts.get(cpu))+' != '+str(len(rows)))
        if any(a[1]['ts']>b[1]['ts'] for a,b in zip(rows,rows[1:])):_bad('CPU '+str(cpu)+' time regressed within sequence')
    if any(counts[cpu]!=0 and cpu not in by_cpu for cpu in counts):_bad('lost events: counted CPU has no records')
    low=min([e.get('enter',e['ts']) for e in events],default=begin['ts']);high=max([e['ts'] for e in events],default=begin['ts'])
    if low<begin['ts']:_bad('event before attach')
    if high>end['ts']:_bad('event after detach')
    lost=0
    for line in stderr.splitlines():
        found=re.search(r'\blost\s+([0-9]+)\s+events?\b',line,re.I)
        if found:lost+=int(found[1])
        elif re.match(r'\s*(error|fatal)\b',line,re.I):_bad('bpftrace error output: '+line[:80])
    if lost:_bad('lost events: bpftrace reported '+str(lost))
    events.sort(key=lambda e:(e['ts'],e.get('cpu',0),e.get('seq',0)))
    return {'begin':begin,'end':end,'events':events,'dirs':{(begin['d1'],begin['i1']),(begin['d2'],begin['i2'])},'counts':counts}

def judge_witness(trace,store,commits):
    """Per-commit rule of R48 4.2 for one store. store={'wal':(dev,ino),'main':(dev,ino),'cgroup':int,'walLen':int};
    commits=[{'end','U','acks':[atNs...],'visible':bool}]. Returns perCommit rows and (code,detail) problems."""
    wal=tuple(store['wal']);main=tuple(store['main']);cg=store['cgroup'];events=trace['events'];problems=[]
    ident=lambda e:(e['dev'],e['ino'])
    writes=[e for e in events if e['k']=='W' and e['ret']>0 and ident(e)==wal]
    dbwrites=[e for e in events if e['k']=='W' and e['ret']>0 and ident(e)==main]
    dir_inodes={i for _,i in trace['dirs']}
    others=[e for e in events if e['k']=='W' and e['ret']>0 and e['parent'] in dir_inodes and ident(e) not in (wal,main)]
    if not writes and others and store['walLen']:problems.append(('WITNESS-UNBOUND','bound WAL inode never written but other inodes were written in the store directory'))
    if sum(1 for e in writes if e['cg']!=cg) or sum(1 for e in dbwrites if e['cg']!=cg):problems.append(('UNWITNESSED-WRITE','write to a bound inode from a cgroup other than the writer\'s'))
    if any(e['k']=='M' and ident(e) in (wal,main) for e in events):problems.append(('UNWITNESSED-WRITE','ext4_page_mkwrite on a bound inode (mmap write)'))
    restarts=[]
    for e in events:
        if e['k']!='T' or ident(e) not in (wal,main):continue
        if e['cg']!=cg:problems.append(('UNWITNESSED-WRITE','truncate/punch/zero of a bound inode from a foreign cgroup'))
        elif e['op'] in ('p','z'):problems.append(('UNWITNESSED-WRITE','hole punch/zero range removes bytes of a bound inode'))
        elif ident(e)==wal:restarts.append(e['ts'])
    seen=False
    for e in writes:
        if e['off']==0 and seen:restarts.append(e['ts'])
        seen=True
    restarts.sort();generation=restarts[-1] if restarts else 0
    live=[e for e in writes if e['ts']>=generation]
    covered=0
    for e in sorted(live,key=lambda e:(e['off'],-e['ret'])):
        if e['off']>covered:break
        covered=max(covered,e['off']+e['ret'])
    if covered<store['walLen']:problems.append(('UNWITNESSED-WRITE','WAL bytes from '+str(covered)+' to '+str(store['walLen'])+' reached the file without a traced write'))
    for r in restarts:
        written=[w['ts'] for w in dbwrites if w['ts']<=r]
        if not written:continue
        floor=max(written)
        if not any(((e['k']=='F' and ident(e)==main) or (e['k']=='S' and e['dev']==main[0] and e['wait']==1)) and e['cg']==cg and e['ret']==0 and e['enter']>=floor and e['ts']<=r for e in events):
            problems.append(('CHECKPOINT-UNSYNCED','WAL restart/truncate at '+str(r)+' without a covering database sync after the last checkpoint write'))
    syncs=sorted((e['enter'],e['ts'],'file' if e['k']=='F' else 'fs') for e in events if
        ((e['k']=='F' and ident(e)==wal) or (e['k']=='S' and e['dev']==wal[0] and e['wait']==1)) and e['cg']==cg and e['ret']==0)
    best=[None]*(len(syncs)+1)
    for index in range(len(syncs)-1,-1,-1):
        mine=(syncs[index][1],syncs[index][2]);best[index]=mine if best[index+1] is None or mine<best[index+1] else best[index+1]
    enters=[s[0] for s in syncs]
    offsets=sorted((e['off'],e['ts']) for e in live);starts=[o for o,_ in offsets];peak=[];top=0
    for _,ts in offsets:top=max(top,ts);peak.append(top)
    rows=[];counts={}
    for commit in commits:
        index=bisect.bisect_left(starts,commit['end']);written=peak[index-1] if index else None
        found=best[bisect.bisect_left(enters,written)] if written is not None else None
        row={'walEnd':commit['end'],'W':written,'D':found[0] if found else None,'via':found[1] if found else None,'codes':[]}
        if found is None:row['codes'].append('SYNC-MISSING')
        else:
            if commit.get('visible') and commit.get('U') is not None and commit['U']<found[0]:row['codes'].append('VISIBLE-BEFORE-DURABLE')
            if any(at<found[0] for at in commit.get('acks',[])):row['codes'].append('ACK-BEFORE-DURABLE')
        for code in row['codes']:counts[code]=counts.get(code,0)+1
        rows.append(row)
    for code,count in counts.items():problems.append((code,str(count)+' of '+str(len(rows))+' commits'))
    return {'perCommit':rows,'problems':problems,'syncsCredited':len(syncs),'writes':len(live)}

def raise_problems(problems):
    if not problems:return
    codes=[code for code,_ in problems];primary=min(codes,key=WITNESS_CODES.index)
    raise WitnessError(primary,'; '.join(sorted({code+' '+detail for code,detail in problems},key=lambda s:WITNESS_CODES.index(s.split(' ',1)[0]))),codes)

def witness_context(case,events,clocks,mode):
    """None only for the offline synthetic fixture mode without a witness; every VM use needs a complete sync-witness/1."""
    config=case.get('witness')
    if config is None:
        if mode=='vm':raise WitnessError('TRACE-INCOMPLETE','VM durable/P3 use requires a complete sync-witness/1 stream (Q108a); none supplied')
        return None
    if mode=='vm' and not isinstance(config,dict):_bad('witness configuration missing')
    metas=[e for e in events if e['event']=='witness-meta'];errs=[e for e in events if e['event']=='witness-stderr']
    chunks=[e for e in events if e['event']=='witness-trace']
    if len(metas)!=1 or len(errs)!=1 or not chunks:_bad('witness meta/stderr/trace events missing or duplicated')
    captured=b''
    for chunk in chunks:
        if chunk['offset']!=len(captured):_bad('witness trace chunk gap/overlap')
        captured+=unblob(chunk['bytes'])
    try:text=captured.decode('utf-8');stderr=unblob(errs[0]['bytes']).decode('utf-8')
    except UnicodeDecodeError:_bad('witness output is not UTF-8')
    trace=parse_witness(text,stderr);meta=metas[0]['meta']
    for field in ('programSha256','bootId','kernelRelease','containerId'):
        if not isinstance(meta.get(field),str) or not meta[field]:_bad('start record lacks '+field)
    if meta['programSha256']!=config.get('programSha256'):_bad('program hash mismatch')
    if config.get('kernelRelease') is not None and meta['kernelRelease']!=config['kernelRelease']:_bad('kernel release mismatch')
    if meta['containerId']!=config.get('containerId'):raise WitnessError('WITNESS-UNBOUND','trace container differs from the inspected witness container')
    domains=[e for e in clocks if e['role']=='witness']
    if len(domains)!=1 or domains[0]['domain']['bootId']!=meta['bootId']:_bad('witness clock-domain/boot mismatch')
    started=config.get('firstCandidateStartNs')
    if type(started) is not int or trace['begin']['ts']>started:_bad('attach later than the first candidate start (or start time missing)')
    stores=config.get('stores')
    if not isinstance(stores,dict) or not stores:_bad('witness store binding missing')
    wanted={tuple(v['dir']) for v in stores.values()}
    if trace['dirs']!=wanted:raise WitnessError('WITNESS-UNBOUND','traced (dev, directory inode) set differs from the configured store directories')
    return {'trace':trace,'meta':meta,'config':config}

def commit_views(source,transactions,summary,polls,acks):
    """Map each WAL commit to its published position, upper bracket U and driver ACKs (for sql01 members)."""
    views=[];first=polls[0];by_member={}
    for t in transactions:
        position=None
        if source['profile']=='sql01':
            rows=t['added']['marker'];position=[rows[0]['epoch'],rows[0]['lsn']] if len(rows)==1 else None
        else:
            rows=[r for r in t['added']['frontier'] if r['consumer']==source['consumer']]
            position=[int(rows[0]['epoch']),int(rows[0]['offset'])+1] if len(rows)==1 else None
        U=None
        if position:U=bracket_for(summary,position)['U'] if tuple(position)>tuple(first['visible']) else first['endNs']
        view={'end':t['walEnd'],'position':position,'U':U,'acks':[],'visible':source['profile']=='sql01'}
        if source['profile']=='sql01':
            for frame in t['added']['frames']:
                for member in frame.get('decoded',{}).get('members',[]):by_member[(frame['decoded']['stream'],member['operationId'],member['attemptId'])]=view
        views.append(view)
    for ack in acks:
        view=by_member.get((ack.get('stream'),ack.get('operationId'),ack.get('attemptId')))
        if view is None:raise WitnessError('WITNESS-UNBOUND','driver ACK binds to no committed member')
        view['acks'].append(ack['atNs'])
    return views

def witness_store(context,source,events,clocks,identity,wal_raw,transactions,summary,polls):
    sid=source['id'];config=context['config'];bind=config['stores'].get(sid)
    if not bind:raise WitnessError('WITNESS-UNBOUND','source has no configured witness store binding')
    binds=[e for e in events if e['event']=='witness-bind' and e['source']==sid]
    if len(binds)!=1 or binds[0]['cgroupId']!=bind['cgroupId'] or type(bind['cgroupId']) is not int:raise WitnessError('WITNESS-UNBOUND','writer cgroup differs from the inspected container cgroup')
    if '-wal' not in identity:raise WitnessError('WITNESS-UNBOUND','no bound WAL file identity')
    ids={name:(kernel_dev(identity[name][0]),identity[name][1]) for name in ('main','-wal')}
    if ids['main'][0]!=bind['dir'][0] or ids['-wal'][0]!=bind['dir'][0]:raise WitnessError('WITNESS-UNBOUND','bound files are not on the witnessed device')
    acks=[]
    for e in events:
        if e['event']=='driver-ack' and e.get('source')==sid:
            if type(e.get('atNs')) is not int or e['atNs']<0:raise WitnessError('WITNESS-UNBOUND','malformed driver ACK')
            same_domain([clocks[0]['domain'],e['domain']]);acks.append(e)
    views=commit_views(source,transactions,summary,polls,acks)
    verdict=judge_witness(context['trace'],{'wal':ids['-wal'],'main':ids['main'],'cgroup':bind['cgroupId'],'walLen':len(wal_raw)},views)
    return verdict,views

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
    roles={'observer',*case['case'].get('clockPids',{}),*(['witness'] if case['case'].get('witness') is not None else [])}
    if {e['role'] for e in clocks} != roles or len(clocks)!=len(roles):
        raise ValueError('missing/duplicate process clock record')
    same_domain([e['domain'] for e in clocks])
    if any(e['event']=='error' for e in events):raise ValueError('collector error; NOT_ESTIMABLE')
    witness=witness_context(case['case'],events,clocks,mode)
    ids=[s['id'] for s in case['case']['sources']]
    if len(ids)!=len(set(ids)) or any(e.get('source') is not None and e['source'] not in ids for e in events):raise ValueError('source inventory binding')
    problems=[]
    result={'format':'obs-vm-publication/1','runId':binding[0],'sourceId':binding[1],'clockMode':mode,'stores':{},'noise':[], 'gone':[],
            'claim':'observer readbacks and intervals only; no NS semantic PASS'}
    for source in case['case']['sources']:
        sid=source['id'];selected=[e for e in events if e.get('source')==sid]
        identity=file_identity(selected);durable=durability_state(source,mode) if witness is None else None
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
        stamp_checks=[]
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
                send=decision_send(events,source,row,clocks,lower,upper)
                window_low,window_high=stamp_window('sql01.frames.committed_at',interval,send)
                if low>high or window_low>window_high:raise ValueError('F20 inverted stamp/window interval')
                if high<window_low or low>window_high:raise ValueError('F20 CR-INCONSISTENT SQL01 decision committed_at')
                stamp_checks.append({'field':'frames.committed_at','kind':STAMP_KINDS['sql01.frames.committed_at'],
                    'lsn':row['lsn'],'stampLowNs':low,'stampHighNs':high,'windowLowNs':window_low,'windowHighNs':window_high})
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
        durability={'basis':'offline-fixture-declared','claim':'fixture visibility only; no kernel witness'}
        if witness is not None:
            # [EXP-OBS01-R9] Why: replaces round 8's unconditional VM refusal; durable only if the kernel witnessed the writer's sync.
            # Rejected: any writerState/PRAGMA declaration as durability evidence (round 7 F2, round 8 reviewer).
            verdict,views=witness_store(witness,source,events,clocks,identity,wal,transactions,summary,polls)
            problems.extend(verdict['problems']);durable_at={tuple(v['position']):row['D'] for v,row in zip(views,verdict['perCommit']) if v['position']}
            for p in positions:
                key=(p['epoch'],p['lsn']) if source['profile']=='sql01' else (int(p['frontier']['epoch']),int(p['frontier']['offset'])+1)
                if durable_at.get(key) is not None:p['D']=durable_at[key];p['durableEndNs']=max(p['U'],p['D'])
            durability={'basis':'kernel-witness','program':witness['meta']['programSha256'],'writerCgroup':witness['config']['stores'][sid]['cgroupId'],
                'syncsCredited':verdict['syncsCredited'],'tracedWalWrites':verdict['writes'],'ackCount':sum(len(v['acks']) for v in views),
                'commits':[{k:row[k] for k in ('walEnd','W','D','via')} for row in verdict['perCommit']],
                'claim':'guest-side sync witnessed in the kernel (Q108b); host power loss not claimed (Q100r)'}
        result['stores'][sid]={'fileIdentity':identity,'writerState':durable,'durability':durability,'stampChecks':stamp_checks,'publication':summary,'positions':positions,'state':state,'transactions':transactions,
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
    raise_problems(problems)
    if witness is not None:result['witness']={'meta':witness['meta'],'attachNs':witness['trace']['begin']['ts'],'detachNs':witness['trace']['end']['ts'],'events':len(witness['trace']['events']),'lostEvents':0}
    return result

if __name__=='__main__':
    try:print(packed(normalize(sys.stdin.buffer.read())).decode())
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(2)
