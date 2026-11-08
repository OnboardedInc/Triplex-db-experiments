#!/usr/bin/env python3
"""Source-linked diagnostic summary; never a protocol acceptance receipt."""
import base64
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import sys

repo = Path(__file__).resolve().parents[2]
root = Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')
result = {'status': 'diagnostic-only; independent verifier recollection still required', 'runs': {}}
for run in ['obs01-xtdb-03','obs01-xtdb-04','obs01-qlever-01','obs01-qlever-02','obs01-xtdb-05']:
    directory = root / run
    bundle = directory / 'output/bundle'
    env = json.loads((bundle/'bundle.json').read_bytes())
    index = json.loads((bundle/'index.json').read_bytes())
    entry = {'retained':str(directory), 'sealed':(bundle/'seal.json').exists(), 'collector':env['collector'],
             'sut':env['sut'], 'bundleSha256':hashlib.sha256((bundle/'bundle.json').read_bytes()).hexdigest(),
             'streams': {sid:len(chunks) for sid,chunks in index.items()}}
    bridge=[json.loads(line) for line in (bundle/'clock/bridge.jsonl').read_text().splitlines()]
    reject=directory/'bridge-rejections.jsonl'
    rejected=[json.loads(line) for line in reject.read_text().splitlines()] if reject.exists() else []
    entry['clock']={'accepted':len(bridge), 'rttMs':[s['receive']-s['send'] for s in bridge], 'rejected':rejected}
    if (bundle/'failure.json').exists(): entry['failure']=json.loads((bundle/'failure.json').read_bytes())
    if 'X1-metrics' in index:
        values=[]
        for e in index['X1-metrics']:
            frame=json.loads((bundle/e['raw']).read_bytes())
            raw=base64.b64decode(frame['rawBase64'])
            if hashlib.sha256(raw).hexdigest()!=frame['rawSha256']: raise ValueError('raw digest differs')
            for line in raw.decode().splitlines():
                if line.startswith('node_tx_latestCompletedTxId{'):
                    metric,value=line.rsplit(' ',1)
                    values.append({'t':frame['tEndMono'],'metric':metric,'value':value})
        unique=list(dict.fromkeys(v['value'] for v in values))
        entry['completedTxGauge']={'samples':len(values),'orderedDistinctValues':unique,'first':values[0],'last':values[-1]}
    if 'Q3-events' in index:
        log=b''
        for e in index['Q3-events']:
            frame=json.loads((bundle/e['raw']).read_bytes()); raw=base64.b64decode(frame['rawBase64'])
            if hashlib.sha256(raw).hexdigest()!=frame['rawSha256']: raise ValueError('raw digest differs')
            tail=json.loads(raw)
            if tail['rotation']: raise ValueError('rotated log')
            log+=base64.b64decode(tail['bytes'])
        entry['cancelEvents']=[json.loads(line) for line in log.splitlines() if b'obs01-cancel' in line]
        raw=base64.b64decode(json.loads((bundle/index['Q1-metrics'][0]['raw']).read_bytes())['rawBase64']).decode()
        entry['qleverCounterSamples']=[line for line in raw.splitlines() if 'sparql_operation' in line and not line.startswith('#')]
    result['runs'][run]=entry
output=repo/'lab/experiments/EXP-OBS01/evidence/diagnostic-summary.json'
output.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n')
print(output)
