#!/usr/bin/env python3
# [EXP-OBS01] Why: screen pinned source bytes under an actually delegated contract obligation.
# Rejected: a broad diagnostic obligation or missing thresholds as substitutes for context authority.
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
repo=Path(__file__).resolve().parents[2];id=sys.argv[1];out=Path(sys.argv[2]);key=sys.argv[3]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
oracle=load('oracle',repo/'runs/OBS01/r3-oracle/observe.py');run=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')/id;root=run/'output/bundle';retention=json.loads((run/'retention.json').read_bytes());case=json.loads((run/'case.json').read_bytes());contract=json.loads((repo/'lab/experiments/EXP-OBS01/round3/contract.json').read_bytes());protocol=case['protocol'];p=protocol.removeprefix('OBS-')
obligation=next(o for o in contract['obligations'] if o['id']==case['obligation'])
assert 'O-OBS' in obligation['oracles'] and protocol in contract['obsProtocols']
ctx={**retention,'format':'obs-context/1','protocol':protocol,'obligation':case['obligation'],'case':id,'witnessKind':p,'thresholdIds':list(obligation['thresholds']),'contractSha256':oracle.digest(contract),'bindings':{}}
if p=='WORK':ctx.update(selectedThreshold=case['threshold'],witnessKind='reuse')
if p=='MAINTENANCE':ctx['selectedThreshold']=case['threshold'];ctx['thresholdIds'].append(case['threshold'])
authenticated,u=oracle.authenticate(root,ctx,key);entries=[];e={};diagnostics={}
for sid,(meta,records) in authenticated.items():
 entry={'kind':meta['kind'],'streamRefs':[sid],'records':records};entries.append(entry)
 for field,value in records.items():
  if field not in e:e[field]=value
 parser=load('retained_'+sid.replace('-','_'),run/'code'/meta['normalizerFile']);policy=next(s for s in ctx['streams'] if s['streamId']==sid)
 raw=b''.join((root/c['raw']).read_bytes() for c in policy['chunks']);parsed=parser.normalize(raw)
 try:
  full,missing=parser.derive_extra(parsed,case,meta['sourceId'].split('.')[0]) if p in parser.EXTRA_PROTOCOLS else parser.derive_resident(parsed,case,meta['sourceId'].split('.')[0])
  diagnostics[sid]={'missing':missing,'derivedFields':list(records)}
  # Caller failure is a case binding, not an engine fact established by HR.
  if p=='AVAILABILITY' and 'tFailure' in full:case['tFailure']=full['tFailure']
 except Exception as error:diagnostics[sid]={'error':str(error)}
source_name='counterSource' if p=='NO-MUTATION' else 'source';e[source_name]=entries[0]
if len(entries)>1:e['corroboration']=entries[1:]
# Bind observed case inputs where available; None records an unavailable event, never a fabricated time/position.
def fallback(field):
 if field in case:return case[field]
 if field=='connectionId':return 'unobserved-target'
 if field=='coverage':
  envelope=json.loads((root/'bundle.json').read_bytes());start=envelope['collector']['startedAtMono'];return {'from':start,'to':start+1,'maxGapMs':0,'segments':[]}
 if field=='unknownOutcomes':return []
 return None
for field in oracle.CASE_FIELDS[p]:
 value=e[field] if field in e else fallback(field);ctx['bindings'][field]=value;e.setdefault(field,value)
if p=='FAULT-TRANSITIONS':ctx.update(variant=case['variant'],transitionExpectations={})
if p=='ERASURE-SCAN':ctx['scanInventory']=case['scanInventory']
result,status=oracle.check(protocol,e,contract,ctx,root,key)
negative=copy.deepcopy(ctx);negative['obligation']=next(o['id'] for o in contract['obligations'] if 'O-OBS' not in o['oracles']);negative_result,_=oracle.check(protocol,e,contract,negative,root,key)
assert negative_result['verdict']=='REFUSED' and 'CONTEXT-CONTRADICTION' in negative_result['reasons'][0]
for name,value in [('context',ctx),('evidence',e),('verdict',result),('derivation',diagnostics),('undelegated-negative',negative_result)]:
 (out/(name+'.json')).write_text(json.dumps(value,indent=2)+'\n')
print(json.dumps({'protocol':protocol,**result,'missingSources':diagnostics},sort_keys=True))
