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
    samples = [{'tStartMono': f['tStartMono'], 'tEndMono': f['tEndMono'], **decode(raw)} for f, raw in frames(data)]
    if not samples:
        raise ValueError('empty stream')
    return {'samples': samples}

if __name__ == '__main__':
    print(json.dumps(normalize(sys.stdin.buffer.read()), sort_keys=True, separators=(',', ':'), allow_nan=False))
