#!/usr/bin/env python3
# [EXP-OBS01] Why: report which reachable sources actually returned bytes without promoting partial snapshots.
# Rejected: counting a readable system table or global I/O delta as a complete protocol witness.
import importlib.util
import hashlib
import json
import os
import re
from pathlib import Path
repo=Path(__file__).resolve().parents[2];base=repo/'lab/experiments/EXP-OBS01/round5';runs=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')
cohort=os.environ.get('OBS01_SCREEN_ID','final')
if not re.fullmatch('[a-z0-9_-]+',cohort):raise ValueError('unsafe cohort')
suffix='-'+cohort if cohort!='final' else ''
rows=json.loads((base/('cli-results-'+cohort+'.json')).read_bytes());result=[]
pins=json.loads((repo/'lab/experiments/EXP-OBS01/round3/pins.json').read_bytes());oracle_path=repo/'runs/OBS01/r3-oracle/observe.py'
if hashlib.sha256(oracle_path.read_bytes()).hexdigest()!=pins['oracleSha256']:raise ValueError('oracle pin mismatch')
s=importlib.util.spec_from_file_location('oracle',oracle_path);oracle=importlib.util.module_from_spec(s);s.loader.exec_module(oracle)
for row in rows:
 if row['mode']!='selected':continue
 run=runs/row['runId'];root=run/'output/bundle';parser=run/'code/normalize.py'
 context=json.loads((base/row['attempt']/row['protocol'][4:]/'context.json').read_bytes());case=json.loads((run/'case.json').read_bytes());envelope=json.loads((root/'bundle.json').read_bytes())
 if case['runId']!=row['runId'] or context['runId']!=row['runId'] or case['engineContainerId']!=envelope['sut']['engineContainerId']:raise ValueError('audit case/engine binding mismatch')
 oracle.authenticate(root,context,repo/'runs/OBS01'/(row['runId']+'.key'))
 s=importlib.util.spec_from_file_location('decoder',parser);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
 index=json.loads((root/'index.json').read_bytes());raw=b''.join((root/e['raw']).read_bytes() for e in index['R5-context']);decoded=m.normalize(raw)
 facts=[];queries=[]
 for sample in decoded['samples']:
  event=sample.get('event',{})
  if event.get('event')=='reachable-source':
   value=event['value'];entry={'name':event['name'],'stage':event['stage'],'tMono':event['tMono']}
   if event['name']=='engine-files':entry.update(fileCount=len(value.get('files',[])),coverage=value.get('coverage'),error=value.get('error'))
   elif event['name']=='cgroup-io':entry.update(owner=value['owner'],attribution=value['attribution'],ioStat=value['ioStat'])
   elif event['name'].startswith('engine-config:'):entry.update(readable='bytes' in value,error=value.get('unavailable'),sha256=value.get('sha256'))
   elif event['name'] in ('X1','X2'):
    entry.update(status=value['status'],sha256=value.get('sha256'),error=value.get('error'))
    if value.get('response'):
     import base64
     response=base64.b64decode(value['response'])
     if event['name']=='X1':entry['gauges']=[x for x in m.decode(response)['metrics'] if x['name'].startswith(('node_tx_','pgwire_cancel'))]
     else:entry['alive']=m.http_body(response)==b'Alive.'
   else:entry['scope']='raw process/listener/config context; not protocol acceptance'
   facts.append(entry)
  elif event.get('event')=='native-session':
   for q in m.pgwire_records(event['wire'])['queries']:
    item={'phase':event['phase'],'sql':q['sql'],'outcome':q.get('outcome'),'sqlstate':q.get('sqlstate'),'error':q.get('error'),'rowsSeen':q.get('rowsSeen'),'columns':sorted(q['rows'][0]) if q.get('rows') else []}
    if event['phase'] in ('fault-readback','fault-position-before','publication-readback'):item['rows']=q['rows']
    queries.append(item)
 positive=[]
 for entry in index.get('H6-files',[]):
  for sample in m.normalize((root/entry['raw']).read_bytes())['samples']:
   event=sample.get('event',{})
   if event.get('event')=='positive-hit-scan':
    import base64
    for hit in event['hits']:
     if event['canary'].encode() not in base64.b64decode(hit['bytes'],validate=True):raise ValueError('positive scan content mismatch')
    positive.append({'canary':event['canary'],'bytesExamined':event['bytesExamined'],'positiveLocations':[h['location'] for h in event['hits']],'coverage':event['coverage']})
 result.append({'protocol':row['protocol'],'runId':row['runId'],'verdict':row['verdict'],'reasons':row['reasons'],'auditFramesSha256':hashlib.sha256(raw).hexdigest(),'decoderSha256':hashlib.sha256(parser.read_bytes()).hexdigest(),'sources':facts,'nativeQueries':queries,'positiveScans':positive,'claim':'source reachability and positive observations only; no additional semantic verdict'})
with (base/('source-audit'+suffix+'-verified.json')).open('x') as file:json.dump(result,file,indent=2);file.write('\n')
print(json.dumps({'protocols':len(result),'sourceReads':sum(len(r['sources']) for r in result),'nativeQueries':sum(len(r['nativeQueries']) for r in result)}))
