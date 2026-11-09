#!/usr/bin/env python3
# [EXP-OBS01] Why: host witness/retention claims require verified bytes before they are published.
# Rejected: checking only that seal.json exists, or trusting normalized output without rerunning the pinned decoder.
import hashlib
import hmac
import json
from pathlib import Path
import subprocess
import sys

def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()
def sha(raw):return hashlib.sha256(raw).hexdigest()
def verify(root,key,config,code):
    root=Path(root).resolve();code=Path(code);key=Path(key).read_bytes();config=json.loads(Path(config).read_bytes())
    def read(name):
        p=(root/name).resolve()
        if not p.is_relative_to(root):raise ValueError('bundle path escapes root')
        return p.read_bytes()
    def signed(name):
        value=json.loads(read(name));signature=value.pop('hmac')
        if not hmac.compare_digest(signature,hmac.new(key,canonical(value),hashlib.sha256).hexdigest()):raise ValueError('invalid HMAC')
        return value
    envelope=json.loads(read('bundle.json'));index=json.loads(read('index.json'));seal=signed('seal.json')
    for field in ('runId','receiptId','keyId','sut','streams'):
        actual=envelope[field];expected=config[field]
        if field=='sut':actual={k:v for k,v in actual.items() if k!='enginePids'};expected={k:v for k,v in expected.items() if k!='enginePids'}
        if actual!=expected:raise ValueError('bundle/config binding mismatch: '+field)
    if envelope['collector']['configSha256']!=sha(canonical(config)+b'\n'):raise ValueError('configuration digest mismatch')
    if seal['runId']!=config['runId'] or set(index)!=set(seal['heads']) or set(index)!={s['streamId'] for s in config['streams']}:raise ValueError('seal inventory mismatch')
    for stream in config['streams']:
        sid=stream['streamId'];previous=None;raw=[];end=envelope['collector']['startedAtMono']
        if not index[sid]:raise ValueError('empty sealed stream')
        for seq,entry in enumerate(index[sid]):
            header=read(entry['header']);head=sha(header);h=signed(entry['header']);data=read(entry['raw'])
            if head!=entry['headerSha256'] or h['streamId']!=sid or h['seq']!=seq or h['prevHeaderSha256']!=previous or h['sha256']!=sha(data) or h['byteLength']!=len(data):raise ValueError('chunk integrity/chain mismatch')
            if not end<=h['tStartMono']<=h['tEndMono']:raise ValueError('chunk predates attempt or regresses')
            end=h['tEndMono'];previous=head;raw.append(data)
        if seal['heads'][sid]!=previous:raise ValueError('final head mismatch')
        parser=code/stream.get('normalizerFile','normalize.py')
        if sha(parser.read_bytes())!=stream['normalizer']['sha256']:raise ValueError('decoder pin mismatch')
        result=subprocess.run([sys.executable,'-I','-B',str(parser)],input=b''.join(raw),capture_output=True,timeout=30)
        if result.returncode or result.stdout!=read('normalized/sources/'+sid+'.json'):raise ValueError('source recomputation mismatch')
    return {'format':'obs01-seal-integrity/1','runId':config['runId'],'engineContainerId':config['sut']['engineContainerId'],'bundleSha256':sha(read('bundle.json')),'sealSha256':sha(read('seal.json')),'claim':'integrity and recomputation only; no semantic acceptance'}

if __name__=='__main__':print(json.dumps(verify(*sys.argv[1:]),sort_keys=True))
