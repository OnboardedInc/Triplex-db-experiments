#!/usr/bin/env python3
# [EXP-OBS01] Why: report source facts with the exact retained decoder, without promoting diagnostic slices.
# Rejected: reconstructing observations from driver assertions.
import importlib.util
import json
from pathlib import Path
import sys
run=Path(sys.argv[1]);bundle=run/'output/bundle';index=json.loads((bundle/'index.json').read_bytes())
spec=importlib.util.spec_from_file_location('retained',run/'code/normalize.py');n=importlib.util.module_from_spec(spec);spec.loader.exec_module(n)
parsed={sid:n.normalize(b''.join((bundle/e['raw']).read_bytes() for e in entries)) for sid,entries in index.items()}
result={'run':str(run),'qualification':'diagnostic-only','streams':{k:len(v['samples']) for k,v in parsed.items()}}
metrics=[]
for sample in parsed.get('X1-metrics',{}).get('samples',[]):
 values={m['name']+m['labels']:m['value'] for m in sample.get('metrics',[]) if any(x in m['name'] for x in ['latestCompleted','latestSubmitted','pgwire_active_connections'])}
 metrics.append({'t':sample['tEndMono'],'values':values})
result['metrics']=metrics
result['connectionSamples']=[{'t':s['tEndMono'],'counts':{port:sum(p['state']=='01' and int(p['local'].rsplit(':',1)[1],16)==int(port) for p in s['sockets']) for port in ['5432','5433']}} for s in parsed.get('H4-all',{}).get('samples',[])]
spans=[span for s in parsed.get('X7-spans',{}).get('samples',[]) for span in s.get('spans',[])]
result['querySpans']=[s for s in spans if s['name']=='xtdb.query']
result['scanSpans']=[s for s in spans if 'scan_rows_read' in s['attributes']]
result['wire']=parsed.get('T1-wire',parsed.get('T2-wire',{})).get('wire')
result['qleverEvents']=parsed.get('Q3-events',{}).get('logRecords',[])
result['qleverMetrics']=[{'t':s['tEndMono'],'metrics':s.get('metrics',[])} for s in parsed.get('Q1-metrics',{}).get('samples',[])]
result['activeQueries']=parsed.get('Q4-active',{}).get('samples',[])
result['engineStatements']=[s for s in parsed.get('X6-log',{}).get('logRecords',[]) if 'Interpreting SQL' in s.get('message','') or 'cancel' in s.get('message','').lower()]
bridge=[json.loads(line) for line in (bundle/'clock/bridge.jsonl').read_text().splitlines()]
result['clock']={'samples':len(bridge),'rttMs':[s['receive']-s['send'] for s in bridge]}
result['scans']=[s['event'] for s in parsed.get('H6-scans',{}).get('samples',[]) if s.get('event',{}).get('event')=='scan']
Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'streams':result['streams'],'querySpans':len(result['querySpans']),'scanSpans':len(result['scanSpans']),'clock':result['clock']}))
