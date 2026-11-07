from pathlib import Path
import datetime,hashlib,json,math
r=Path("<writer-source-runtime>/build/native-writer-b0-broad-20261106/forward-01");roles={}
for role in ['original_B0','cpp_candidate']:
 d=json.loads((r/role/'result.json').read_text());a=json.loads((r/role/'arm.json').read_text());assert a['status']=='passed';m=d['stages'][0]['cells'][-1]
 total=sum(len(c['samples'])for c in d['stages'][0]['cells']);violations=[]
 for c in d['stages'][0]['cells']:
  for v in c['samples']:
   if not c['mixedIngestion']or v['cut']=='fixed':assert int(v['position'])==39087
   else:
    ack=sum(w['startOffsetMs']+w['elapsedMs']<=v['startOffsetMs']for w in c['writes'])
    issued=sum(w['startOffsetMs']<=v['startOffsetMs']+v['elapsedMs']for w in c['writes'])
    if not39087+ack<=int(v['position'])<=39087+issued:violations.append(v)
 assert not violations
 windows=[sum(i*10000<=w['startOffsetMs']+w['elapsedMs']<(i+1)*10000 for w in m['writes'])for i in range(math.floor(m['wallMs']/10000))];assert all(windows)
 roles[role]=dict(totalSamples=total,mixedReads=len(m['samples']),acks=len(m['writes']),ackWindows=windows,latestFrontierViolations=violations,childPid=a['terminal']['pid'],outerPid=a['terminal']['parentPid'],finalK=str(39087+len(m['writes'])),rawSha256=hashlib.sha256((r/role/'result.json').read_bytes()).hexdigest())
proof=dict(schema='td.native-writer-b0-forward-postack/1',status='passed',atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),roles=roles,totalSavedSamples=sum(v['totalSamples']for v in roles.values()),nativeACKs=sum(v['acks']for v in roles.values()),scope='Offline raw timestamps/positions; full typed answers checked in flight by unchanged driver')
with(r/'postack-audit-first.json').open('x')as out:json.dump(proof,out,indent=2);out.write('\n')
print(json.dumps(proof))
