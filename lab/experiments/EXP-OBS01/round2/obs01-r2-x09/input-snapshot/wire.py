# [EXP-OBS01] Why: reconstruct statements and replies from independently captured TCP bytes.
# Rejected: accepting query labels/counters reported by the adapter. Classification follows EXP-C8's
# conservative mechanism, adapted to offline bidirectional parsing; unknowns refuse rather than become reads.
import base64
import bisect
import json
import re
import struct
from urllib.parse import parse_qs, urlsplit

def sql_kind(sql):
    words=[];i=0
    while i<len(sql):
        if sql.startswith('--',i):
            while i<len(sql) and sql[i] not in '\r\n':i+=1
        elif sql.startswith('/*',i):
            end=sql.find('*/',i+2)
            if end<0:raise ValueError('unterminated SQL comment')
            i=end+2
        elif sql[i] in "'\"":
            quote=sql[i];escaped=quote=="'" and i>0 and sql[i-1] in 'eE';i+=1
            while i<len(sql):
                if escaped and sql[i]=='\\':i+=2;continue
                if sql[i]==quote:
                    if i+1<len(sql) and sql[i+1]==quote:i+=2;continue
                    i+=1;break
                i+=1
            else:raise ValueError('unterminated SQL literal')
        elif sql[i].isalpha() or sql[i]=='_':
            end=i+1
            while end<len(sql) and (sql[end].isalnum() or sql[end]=='_'):end+=1
            words.append(sql[i:end].upper());i=end
        else:i+=1
    if any(w in {'INSERT','UPDATE','DELETE','ERASE','PATCH','MERGE','CREATE','ALTER','DROP','ASSERT','COPY','TRUNCATE','COMMIT'} for w in words): return 'write'
    if not words: return 'session'
    if words[0] in {'SELECT','WITH','FROM','VALUES','XTQL','EXPLAIN','SHOW','TABLE','SETTING'}: return 'read'
    if words[0] in {'SET','ROLLBACK','DISCARD','DEALLOCATE'} or words[:3]==['BEGIN','READ','ONLY']: return 'session'
    return 'unknown'

def wire_tag(sql):
    match=re.search(r'/\*obs:([A-Za-z0-9_-]+)\*/',sql)
    return match.group(1) if match else None

def collect_wire(events):
    connections={}
    for event in events:
        cid=event.get('connectionId')
        if not cid: continue
        c=connections.setdefault(cid,{'connectionId':cid,'client':[],'engine':[]})
        kind=event['event']
        if kind=='open': c.update({('clientAddress' if k=='client' else k):v for k,v in event.items() if k!='event'})
        elif kind=='data': c[event['direction']].append((base64.b64decode(event['data'],validate=True),event['tMono']))
        elif kind=='close': c['closedAt']=event['tMono']
        elif kind=='error': raise ValueError('proxy transport failure: '+event['error'])
    return connections

def wire_bytes(segments):
    chunks=[];ends=[];timestamps=[];total=0
    for data,t in segments:chunks.append(data);total+=len(data);ends.append(total);timestamps.append(t)
    raw=b''.join(chunks)
    def when(pos):
        index=bisect.bisect_left(ends,pos)
        if index>=len(ends):raise ValueError('wire timestamp absent')
        return timestamps[index]
    return raw,when

def pgwire_records(events):
    connections=collect_wire(events);queries=[];cancels=[];backend={}
    for cid,c in connections.items():
        data,at=wire_bytes(c['client']);server,sat=wire_bytes(c['engine']);pos=0;prepared={};portals={};pending=[]
        startup=True;ssl=False
        while pos<len(data):
            begin=pos
            if startup:
                if pos+8>len(data): raise ValueError('truncated pgwire startup')
                length,code=struct.unpack('!II',data[pos:pos+8])
                if length<8 or length>8*1024*1024 or pos+length>len(data): raise ValueError('invalid pgwire startup length')
                chunk=data[pos:pos+length];pos+=length
                if code==80877103:
                    if length!=8: raise ValueError('bad SSL request')
                    ssl=True;continue
                if code==80877102:
                    if length!=16: raise ValueError('bad cancel request')
                    pid,key=struct.unpack('!II',chunk[8:]);cancels.append({'backendPid':pid,'t':at(pos),'connectionId':cid});startup=False;continue
                if code!=196608: raise ValueError('unsupported pgwire protocol')
                startup=False;continue
            if pos+5>len(data): raise ValueError('truncated pgwire message')
            typ=chr(data[pos]);length=struct.unpack('!I',data[pos+1:pos+5])[0]
            if length<4 or pos+1+length>len(data): raise ValueError('invalid pgwire message length')
            payload=data[pos+5:pos+1+length];pos+=1+length
            sql=None
            if typ=='Q': sql=payload.rstrip(b'\0').decode('utf8')
            elif typ=='P':
                name,text,*rest=payload.split(b'\0');prepared[name]=text.decode('utf8')
            elif typ=='B':
                name,statement,*_=payload.split(b'\0');portals[name]=statement
            elif typ=='E':
                portal=payload.split(b'\0',1)[0]
                if portal not in portals or portals[portal] not in prepared: raise ValueError('unbound prepared execute')
                sql=prepared[portals[portal]]
            elif typ not in {'S','H','X','C','D','p'}: raise ValueError('unsupported pgwire client message '+typ)
            if sql is not None:
                kind=sql_kind(sql)
                if kind=='unknown': raise ValueError('unclassified SQL')
                q={'connectionId':cid,'sql':sql,'tag':wire_tag(sql),'kind':kind,'tStart':at(begin+1),'tSent':at(pos),'rows':[]}
                queries.append(q);pending.append(q)
        pos=0;fields=[];qindex=0
        if ssl and server:
            if server[:1]!=b'N': raise ValueError('encrypted pgwire is not observable')
            pos=1
        while pos<len(server):
            if pos+5>len(server):
                c['serverDecodeError']='truncated server message';break
            typ=chr(server[pos]);length=struct.unpack('!I',server[pos+1:pos+5])[0]
            if length<4 or pos+length+1>len(server):
                c['serverDecodeError']='truncated server payload';break
            payload=server[pos+5:pos+length+1];pos+=length+1
            if typ=='K': backend[struct.unpack('!I',payload[:4])[0]]=cid
            if typ=='R' and struct.unpack('!I',payload[:4])[0]!=0: raise ValueError('authenticated/encrypted wire not supported')
            if typ=='T':
                fields=[];n=struct.unpack('!H',payload[:2])[0];i=2
                for _ in range(n):
                    end=payload.index(b'\0',i);fields.append(payload[i:end].decode());i=end+19
            if qindex>=len(pending):continue
            q=pending[qindex]
            if typ=='D':
                n=struct.unpack('!H',payload[:2])[0];i=2;values=[]
                for _ in range(n):
                    size=struct.unpack('!i',payload[i:i+4])[0];i+=4
                    if size==-1: values.append(None);continue
                    value=payload[i:i+size].decode();i+=size
                    try:value=json.loads(value)
                    except ValueError:pass
                    values.append(value)
                q['rowsSeen']=q.get('rowsSeen',0)+1
                if len(q['rows'])<256:q['rows'].append(dict(zip(fields,values)))
            if typ in ('C','E'):
                q['tEnd']=sat(pos);q['commandComplete']=payload.rstrip(b'\0').decode(errors='replace') if typ=='C' else None;q['outcome']='success' if typ=='C' else 'error'
                if typ=='E':
                    error={v[:1].decode():v[1:].decode(errors='replace') for v in payload.split(b'\0') if v}
                    q['sqlstate']=error.get('C');q['error']=error.get('M')
                qindex+=1;fields=[]
        for q in pending:
            if 'tEnd' not in q and 'closedAt' not in c: raise ValueError('query still in flight at seal')
    for cancel in cancels:cancel['targetConnectionId']=backend.get(cancel['backendPid'])
    return {'queries':queries,'cancels':cancels,'connections':[{k:v for k,v in c.items() if k not in ('client','engine')} for c in connections.values()]}

def http_messages(data):
    messages=[];pos=0
    while pos<len(data):
        end=data.find(b'\r\n\r\n',pos)
        if end<0: raise ValueError('truncated HTTP headers')
        lines=data[pos:end].decode('iso-8859-1').split('\r\n');headers={}
        for line in lines[1:]:
            key,value=line.split(':',1);key=key.lower()
            if key in headers and key in ('content-length','transfer-encoding'):raise ValueError('ambiguous HTTP length')
            headers[key]=value.strip()
        start=pos;pos=end+4
        if 'chunked' in headers.get('transfer-encoding','').lower():
            body=b''
            while True:
                end=data.find(b'\r\n',pos)
                if end<0:raise ValueError('truncated chunk length')
                size=int(data[pos:end].split(b';')[0],16);pos=end+2
                if size==0:
                    if data[pos:pos+2]!=b'\r\n':raise ValueError('HTTP trailers not supported')
                    pos+=2;break
                if pos+size+2>len(data) or data[pos+size:pos+size+2]!=b'\r\n':raise ValueError('truncated HTTP chunk')
                body+=data[pos:pos+size];pos+=size+2
        else:
            size=int(headers.get('content-length','0'))
            if size<0 or pos+size>len(data):raise ValueError('truncated HTTP body')
            body=data[pos:pos+size];pos+=size
        messages.append({'line':lines[0],'headers':headers,'body':body,'start':start,'end':pos})
        if headers.get('upgrade','').lower()=='websocket' or lines[0].startswith('HTTP/1.1 101'):
            return messages,data[pos:]
    return messages,b''

def http_wire_records(events):
    result=[];websockets=[];connections=collect_wire(events)
    readonly={'stats','cache-stats','get-settings','get-index-id','dump-active-queries','clear-cache'}
    for cid,c in connections.items():
        raw,at=wire_bytes(c['client']);replies,sat=wire_bytes(c['engine'])
        requests,frames=http_messages(raw);responses,_=http_messages(replies)
        for i,req in enumerate(requests):
            method,target,_=req['line'].split(' ',2);url=urlsplit(target);params=parse_qs(url.query,keep_blank_values=True)
            body=req['body'].decode('utf8');content=req['headers'].get('content-type','').split(';')[0]
            if content=='application/x-www-form-urlencoded':
                for key,values in parse_qs(body,keep_blank_values=True).items():params.setdefault(key,[]).extend(values)
            if any(len(v)!=1 for v in params.values()):raise ValueError('duplicate QLever parameter')
            command=params.get('cmd',[None])[0];text=params.get('query',[None])[0];kind='unknown'
            if url.path.startswith('/watch/'):kind='session'
            elif content=='application/sparql-update' or 'update' in params:kind='write';text=body or params['update'][0]
            elif content=='application/sparql-query' or text is not None:kind='read';text=text or body
            elif command:kind='session' if command in readonly else 'write'
            elif url.path in ('/ping','/metrics'):kind='session'
            if kind=='unknown':raise ValueError('unclassified QLever request')
            if kind=='read' and re.search(r'\b(INSERT|DELETE|LOAD|CLEAR|CREATE|DROP|MOVE|COPY|ADD)\b',text or '',re.I):raise ValueError('write-shaped query parameter')
            q={'connectionId':cid,'kind':kind,'queryId':req['headers'].get('query-id'),'query':text,'command':command,'tStart':at(req['start']+1),'tSent':at(req['end'])}
            if i<len(responses):
                response=responses[i];q['status']=int(response['line'].split()[1]);q['tEnd']=sat(response['end']);q['body']=response['body'].decode('utf8')
            elif 'closedAt' not in c:raise ValueError('HTTP request still in flight')
            result.append(q)
        pos=0
        while pos<len(frames):
            if pos+2>len(frames):raise ValueError('truncated websocket frame')
            op=frames[pos]&15;masked=bool(frames[pos+1]&128);size=frames[pos+1]&127;pos+=2
            if size>=126:
                n=2 if size==126 else 8
                if pos+n>len(frames):raise ValueError('truncated websocket length')
                size=int.from_bytes(frames[pos:pos+n],'big');pos+=n
            if not masked or pos+4+size>len(frames):raise ValueError('unmasked/truncated client websocket')
            mask=frames[pos:pos+4];pos+=4;body=bytes(v^mask[i%4] for i,v in enumerate(frames[pos:pos+size]));pos+=size
            if op==1:websockets.append({'connectionId':cid,'text':body.decode('utf8')})
            elif op!=8:raise ValueError('fragmented websocket command not supported')
    return {'queries':result,'websockets':websockets,'connections':[{k:v for k,v in c.items() if k not in ('client','engine')} for c in connections.values()]}
