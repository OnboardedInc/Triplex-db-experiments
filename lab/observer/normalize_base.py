#!/usr/bin/env python3
"""Pinned stdlib source decoder; outputs samples, never synthetic protocol PASS fields."""
import base64
from decimal import Decimal
import hashlib
import http.client
import io
import json
import re
import sys

# [EXP-OBS01] Why: the evaluator pins this standalone parser, and bytes are decoded again.
# Rejected: accepting precomputed record objects from the collector or gateway.
def frames(data):
    previous = -1
    for line in data.splitlines():
        f = json.loads(line)
        raw = base64.b64decode(f['rawBase64'], validate=True)
        if hashlib.sha256(raw).hexdigest() != f['rawSha256']:
            raise ValueError('source bytes hash mismatch')
        if not previous <= f['tStartMono'] <= f['tEndMono']:
            raise ValueError('sample clock order')
        previous = f['tEndMono']
        yield f, raw

class MemorySocket:
    def __init__(self, raw): self.raw = raw
    def makefile(self, *args, **kwargs): return io.BytesIO(self.raw)

def http_body(raw):
    response = http.client.HTTPResponse(MemorySocket(raw))
    response.begin()
    if response.status != 200:
        raise ValueError('unsuccessful source response')
    return response.read()

def prometheus(raw):
    samples = []
    for line in raw.decode('utf8').splitlines():
        if not line or line.startswith('#'):
            continue
        match = re.fullmatch(r'([a-zA-Z_:][a-zA-Z0-9_:]*)(\{.*\})?\s+([^\s]+)(?:\s+[^\s]+)?', line)
        if not match:
            raise ValueError('malformed Prometheus sample')
        name, labels, value = match.groups()
        # Preserve exact decimal text and all labels, including every XTDB db tag.
        # NaN is legal for an uninitialized Prometheus gauge, never a business value.
        Decimal(value)
        samples.append({'name': name, 'labels': labels or '{}', 'value': value})
    if not samples:
        raise ValueError('empty Prometheus response')
    return samples

def decode(raw):
    if raw.startswith(b'HTTP/'):
        body = http_body(raw)
        if body.lstrip().startswith((b'{', b'[')):
            return {'response': json.loads(body)}
        return {'metrics': prometheus(body)}
    text = raw.decode('utf8')
    if text.startswith('  sl') or text.lstrip().startswith('sl '):
        sockets = []
        for line in text.splitlines()[1:]:
            fields = line.split()
            if len(fields) < 10:
                raise ValueError('truncated proc socket table')
            sockets.append({'local': fields[1], 'remote': fields[2], 'state': fields[3], 'inode': fields[9]})
        return {'sockets': sockets}
    if text.lstrip().startswith('{'):
        # Raw thread or log-tail snapshots: validate payload encodings, preserving exact bytes.
        value = json.loads(text)
        if value.get('event') == 'sockets':
            sockets=[]
            for content in value['files'].values():sockets.extend(decode(base64.b64decode(content,validate=True))['sockets'])
            return {'sockets':sockets}
        if value.get('event') == 'resource':
            fields={k:int(base64.b64decode(v,validate=True).strip()) for k,v in value['files'].items()}
            return {'resource':{'memory':fields,'disk':sum(f['blocks']*512 for f in value['diskFiles']),'owner':value['owner']}}
        if value.get('event') == 'query':
            events=[{'event':'open','connectionId':'observer-query','tMono':0,'enginePort':5432,'upstreamPort':0},
                    {'event':'data','connectionId':'observer-query','direction':'client','tMono':0,'data':value['client']},
                    {'event':'data','connectionId':'observer-query','direction':'engine','tMono':1,'data':value['engine']},
                    {'event':'close','connectionId':'observer-query','tMono':1}]
            wire=pgwire_records(events)
            if any(c.get('serverDecodeError') for c in wire['connections']):raise ValueError('truncated independent count reply')
            queries=[q for q in wire['queries'] if q['kind']=='read']
            if len(queries)!=1 or queries[0].get('outcome')!='success':raise ValueError('observer query result unavailable')
            return {'queryResult':{'relation':value['relation'],'label':value['label'],'rows':queries[0]['rows']}}
        if value.get('event') == 'otlp':
            spans = otlp_spans(base64.b64decode(value['body'], validate=True))
            for span in spans:
                span['startMono'] = value['receivedMono'] + (span['startUnixNs']/1e6 - value['receivedReal'])
                span['endMono'] = value['receivedMono'] + (span['endUnixNs']/1e6 - value['receivedReal'])
            return {'spans': spans}
        if 'event' in value:
            return {'event': value}
        if 'bytes' in value:
            value['text'] = base64.b64decode(value.pop('bytes'), validate=True).decode('utf8')
            if value['rotation']:
                raise ValueError('log rotated: coverage requires a new evaluation window')
        else:
            value = {k: base64.b64decode(v, validate=True).decode('utf8') for k, v in value.items()}
        return value
    if text.strip().isdigit():
        return {'value': int(text.strip())}
    values = {}
    for line in text.splitlines():
        key, *parts = line.split()
        if key in values:
            raise ValueError('duplicate kernel counter')
        values[key] = [int(x) if x.isdigit() else x for x in parts]
    if not values:
        raise ValueError('empty source')
    return {'counters': values}

def normalize(data):
    decoded=list(frames(data))
    samples=[{'tStartMono':f['tStartMono'],'tEndMono':f['tEndMono'], 'runStartedMono':f.get('runStartedMono'), **decode(raw)} for f,raw in decoded]
    if not samples:raise ValueError('empty stream')
    result={'samples':samples}
    events=[s['event'] for s in samples if 'event' in s]
    opens=[e for e in events if e['event']=='open']
    if events and any(e['event']=='data' for e in events):
        engine_ports={e['enginePort'] for e in opens}
        if engine_ports=={5432}:result['wire']=pgwire_records(events)
        elif engine_ports=={7019}:result['wire']=http_wire_records(events)
        else:raise ValueError('unsupported/mixed transport source')
    elif events:result['wire']={'queries':[],'connections':[],'cancels':[]}
    tails=[(f,s) for (f,_),s in zip(decoded,samples) if 'text' in s]
    if tails:
        buffer='';records=[];end_offset=0;inode=None
        for f,s in tails:
            if s['offset']!=end_offset or (inode is not None and inode!=s['inode']):raise ValueError('tail coverage gap')
            inode=s['inode'];end_offset=s['offset']+len(s['text'].encode('utf8'));buffer+=s['text']
            lines=buffer.split('\n');buffer=lines.pop()
            for line in lines:
                if not line:continue
                if line.startswith('{'):record=json.loads(line);real=record.get('ts-ms')
                else:
                    parts=line.split('|',3)
                    if len(parts)!=4:raise ValueError('unrecognized engine log')
                    real=int(parts[0]);record={'level':parts[1],'logger':parts[2],'message':json.loads('"'+parts[3]+'"')}
                if real is None:raise ValueError('engine timestamp absent')
                record['tMono']=f.get('sourceMono',f['tStartMono'])+(real-f['tStartReal']);records.append(record)
        if buffer:raise ValueError('incomplete final log line')
        result['logRecords']=records
    return result

if __name__ == '__main__':
    print(json.dumps(normalize(sys.stdin.buffer.read()), sort_keys=True, separators=(',', ':'), allow_nan=False))
