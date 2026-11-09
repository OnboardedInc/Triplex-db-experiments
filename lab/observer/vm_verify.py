#!/usr/bin/env python3
"""Evaluator readback: independently authenticate and rerun VM observer normalizers."""
import importlib.util
import json
from pathlib import Path
import sys
import time
from verify_seal import verify
from vm_normalizer import packed,sha


def replay(directory,oracle_file,container_id):
    directory=Path(directory);root=directory/'output/bundle';config=directory/'output/observed-config.json';code=directory/'code';key=directory/'external.key'
    document=json.loads(config.read_bytes());controller=json.loads((directory/'controller.json').read_bytes())
    if document['collector']['containerId']!=container_id:raise ValueError('actual observer container binding differs')
    for file,pin in controller['pins'].items():
        if sha((code/file).read_bytes())!=pin:raise ValueError('evaluator source drift')
    integrity=verify(root,key,config,code)
    envelope=json.loads((root/'bundle.json').read_bytes());index=json.loads((root/'index.json').read_bytes())
    spec=importlib.util.spec_from_file_location('obs01_oobs',oracle_file);oracle=importlib.util.module_from_spec(spec);spec.loader.exec_module(oracle)
    streams=[];witnesses=[]
    for stream in envelope['streams']:
        sid=stream['streamId'];entries=index[sid]
        streams.append({**stream,'normalizerPath':str((code/stream['normalizerFile']).resolve()),'chunks':entries})
        witnesses.append({'runId':document['runId'],'streamId':sid,'seq':len(entries)-1,'headSha256':entries[-1]['headerSha256'],'tMono':time.monotonic_ns()/1e6})
    context={'format':'obs-context/1','runId':document['runId'],'receiptId':document['receiptId'],'keyId':document['keyId'],
        'protocol':'OBS-VM-PUBLICATION','obligation':'B6-diagnostic','case':'OBS01-R6','witnessKind':'VM-PUBLICATION','thresholdIds':[],
        'contractSha256':'no-semantic-admission','bundleSha256':sha((root/'bundle.json').read_bytes()),'bridgeSha256':sha((root/'clock/bridge.jsonl').read_bytes()),
        'engine':document['sut']['lane'],'bindings':{},'clockMaxUncertaintyMs':document['maxUncertaintyMs'],'streams':streams,'witnessHeads':witnesses}
    result,_=oracle.authenticate(root,context,key)
    for sid,(_,normalized) in result.items():
        if normalized!=json.loads((root/'normalized/sources'/ (sid+'.json')).read_bytes()):raise ValueError('O-OBS recomputation differs')
    (directory/'witness.jsonl').write_bytes(b''.join(packed({**w,'clockScope':'Mac witness only; not VM timing evidence'})+b'\n' for w in witnesses))
    (directory/'oobs-context.json').write_bytes(packed(context))
    return {'format':'obs01-vm-integrity/1','claim':'integrity and parser equality only; no NS semantic PASS',
        'runId':document['runId'],'containerId':container_id,'integrity':integrity,'oracleSha256':sha(Path(oracle_file).read_bytes()),'recomputedStreams':sorted(result)}

if __name__=='__main__':print(packed(replay(*sys.argv[1:])).decode())
