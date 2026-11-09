#!/usr/bin/env python3
# [EXP-OBS01] Why: use authenticated vendor/wire derivations in the unmodified consumer.
# Rejected: treating authentication alone as protocol screening or production acceptance.
import copy
import importlib.util
import json
from pathlib import Path
import sys
repo=Path(__file__).resolve().parents[2];sys.path.insert(0,str(repo/'runs/OBS01/oracle'))
spec=importlib.util.spec_from_file_location('observe',repo/'runs/OBS01/oracle/observe.py');oracle=importlib.util.module_from_spec(spec);spec.loader.exec_module(oracle)
run=Path(sys.argv[1]);key=sys.argv[2];output=Path(sys.argv[3]);output.mkdir(parents=True,exist_ok=True)
retention=json.loads((run/'retention.json').read_bytes());root=run/'output/bundle';contract=json.loads((repo/'lab/acceptance/obligations.json').read_bytes())
context={**retention,'format':'obs-context/1','protocol':'OBS-NO-MUTATION','obligation':'G3.recursion.read-only-frontier','case':'observer-source-diagnostic','witnessKind':'NO-MUTATION','thresholdIds':[],'contractSha256':oracle.digest(contract),'bindings':{}}
authenticated,u=oracle.authenticate(root,context,key)
def entry(sid):
 meta,records=authenticated[sid]
 return {'kind':meta['kind'],'streamRefs':[sid],'records':records}
results={}
cases=[('NO-MUTATION','X1-metrics','T1-wire'),('PREABORT','X6-log','T1-wire'),('SCRATCH','X4-queries',None)]
if 'forecast' in authenticated.get('H1-resources',({},{}))[1]:cases.append(('RESOURCE','H1-resources',None))
if 'engineConnectionSamples' in authenticated.get('H4-all',({},{}))[1]:cases.append(('CONNECTIONS','H4-all',None))
for protocol,primary,secondary in cases:
 e={};entries=[entry(primary)]+([entry(secondary)] if secondary else [])
 for s in entries:
  for name,value in s['records'].items():
   if name not in e:e[name]=value
 source_name='counterSource' if protocol=='NO-MUTATION' else 'source';e[source_name]=entries[0]
 if secondary:e['corroboration']=[entries[1]]
 ctx=copy.deepcopy(context);ctx.update(protocol='OBS-'+protocol,witnessKind=protocol)
 if protocol=='PREABORT':ctx['bindings']={k:e[k] for k in ('requestId','coverage')}
 if protocol=='RESOURCE':ctx['bindings']={k:e[k] for k in ('forecast','envelope','obligation')}
 if protocol=='CONNECTIONS':ctx['bindings']={k:e[k] for k in ('poolDeclarations','baseline','tClose')}
 if protocol=='SCRATCH':ctx['bindings']={k:e[k] for k in ('relation','unknownOutcomes')}
 result,status=oracle.check('OBS-'+protocol,e,contract,ctx,root,key);results[protocol]=result
 (output/(protocol+'.evidence.json')).write_text(json.dumps(e,indent=2)+'\n');(output/(protocol+'.context.json')).write_text(json.dumps(ctx,indent=2)+'\n')
 if protocol=='NO-MUTATION':
  single=copy.deepcopy(e);single.pop('corroboration')
  negative,_=oracle.check('OBS-'+protocol,single,contract,ctx,root,key);results['single-kind-negative']=negative
(output/'verdicts.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,sort_keys=True))
