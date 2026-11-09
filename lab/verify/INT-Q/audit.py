# [CX-VINTQ] Why: independently enumerate recursive contract hash references and compare both merge parents. Rejected: trusting the builder's count or report alone.
import hashlib,json,pathlib,re,subprocess
root=pathlib.Path.cwd(); out=root/'lab/verify/INT-Q/output'
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda *args:subprocess.check_output(['git',*args])
pins={}; origins={}
def add(p,h,origin):
 if not isinstance(p,str) or not isinstance(h,str) or not re.fullmatch('[a-f0-9]{64}',h):return
 if p.startswith(('sha256:', 'http:','https:')):return
 if not (root/p).is_file():return
 pins.setdefault(p,set()).add(h);origins.setdefault(p,set()).add(origin)
def walk(x,origin):
 if isinstance(x,dict):
  for p in ['path','file']:add(x.get(p),x.get('sha256'),origin)
  for k,v in x.items():
   add(k,v,origin);walk(v,origin)
 elif isinstance(x,list):
  for v in x:walk(v,origin)
for f in (root/'lab/acceptance').glob('*.json'):walk(json.loads(f.read_text()),str(f.relative_to(root)))
direct=sorted(pins);extra=[]
# Follow pinned checksum manifests too; their relative paths use the repository or known manifest domain.
for f in list(direct):
 if 'SHA256SUMS' not in f:continue
 for line in (root/f).read_text().splitlines():
  m=re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)',line)
  if not m:continue
  h,p=m.groups()
  for candidate in [p,str(pathlib.Path(f).parent/p),'lab/world/W0/'+p,'lab/oracles/replay/'+p,'lab/oracles/obs/'+p]:
   if (root/candidate).is_file():add(candidate,h,f);break
changed=set(git('diff','--name-only','7a27b149','3c2e4b8').decode().splitlines())
rows=[]
for p in sorted(pins):
 b=git('show','7a27b149:'+p);a=git('show','3c2e4b8:'+p)
 rows.append(dict(path=p,expected=sorted(pins[p]),baseSha256=sha(b),headSha256=sha(a),changed=b!=a,origins=sorted(origins[p])))
(out/'pins.json').write_text(json.dumps(dict(directCount=len(direct),expandedCount=len(rows),changedPins=[r for r in rows if r['changed']],direct=direct,rows=rows),indent=2)+'\n')
files={
'6ae38068':['packages/core/src/runtime/index.ts','packages/qlever/src/QleverQueryExecutor.ts','packages/qlever/src/QleverStorageAdapter.ts','packages/qlever/src/index.ts','packages/qlever/src/native/NativeQueries.ts'],
'8e9b682f':['packages/qlever/src/broker/BrokerStorageAdapter.ts']}
for merge,paths in files.items():
 for n in [1,2]:
  (out/f'{merge}-parent{n}.diff').write_bytes(git('diff',f'{merge}^{n}',merge,'--',*paths))
# Builder receipts are historical observations: check bytes, exact commands and product bindings.
audit=[]
for entry in json.loads((root/'lab/experiments/INT-Q/gate-receipts.json').read_text()):
 f=pathlib.Path(entry['receipt']);b=f.read_bytes();r=json.loads(b);log=f.parent/'command.log'
 differences=[p for p,h in r['inputs'].items() if (root/p).is_file() and sha((root/p).read_bytes())!=h]
 audit.append(dict(label=entry['label'],receiptShaMatches=sha(b)==entry['sha256'],logShaMatches=sha(log.read_bytes())==r['logSha256'],head=r['head'],start=r['start'],end=r['end'],result=r['result'],sourceStillMatches=r['sourceStillMatches'],changedSinceRun=differences,argv=r['command']))
(out/'builder-receipt-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps(dict(directPins=len(direct),expandedPins=len(rows),changedPins=[r['path'] for r in rows if r['changed']],builderReceiptHashFailures=[r['label'] for r in audit if not r['receiptShaMatches'] or not r['logShaMatches']])))
