"""Audit full fresh diagnostics against prior reviewed guards and every added control."""
import hashlib
import json
from pathlib import Path
import re
HERE=Path(__file__).resolve().parent
S=json.loads((HERE/'source.json').read_bytes());RAW=Path(S['raw'])
m=json.loads((RAW/'mutations.json').read_bytes())
prior=HERE.parent/'v0312r2/mutation-reason-audit.json'
old={x['name']:x for x in json.loads(prior.read_bytes())['records']}
assert m['catalog']==582 and m['run']==494 and len(m['retired'])==88
aliases={'Q83e revived':'Q93: content admission replaces Q83d/e process predicates','Q78 null image bypass':'Q61i: missing image must still block lane D','Q78 D raw obligation omitted':'Q61i: lane D image pin removes only the image blocker, never grants qualification'}
records=[];coverage={};added=[]
for i,x in enumerate(m['records']):
 text=(x['stdout']+x['stderr']).strip()
 assert x['exit']!=0 and text.splitlines()[0]=='CONTRACT INVALID:' and 'Traceback (most recent call last)' not in text,x['name']
 name=x['name']
 if name not in old:added.append(name)
 if name in aliases:pattern=re.escape(aliases[name]);basis='image pin now authorized; same missing-image/applicability property'
 elif name in old:pattern=old[name]['expectedGuardPattern'];basis='previous independently reviewed intended/equivalent guard'
 else:
  tags=re.findall(r'Q\d+[a-z]?',name)
  assert tags,name
  pattern='|'.join(re.escape(t) for t in tags);basis='new ruling or pin guard'
 assert re.search(pattern,text),(name,text)
 rid=name.split()[0]
 if rid in {*(f'Q91{c}' for c in 'abcd'),*(f'Q93{c}' for c in 'abc'),*(f'Q94{c}' for c in 'bcdefghi')} and ('literal weakened' in name or 'consumer dropped' in name):
  assert rid+': required literal consumer missing or weakened' in text
  coverage.setdefault(rid,[]).append(name)
 records.append({'index':i,'name':name,'expectedGuardPattern':pattern,'basis':basis,'diagnostics':text.splitlines()[1:]})
assert len(coverage)==15 and all(len(v)==2 for v in coverage.values())
assert len(added)==50
# [CX-VA01-0313] Why: retain expected-guard provenance but compare against newly executed children, including corrected effective amendment targets. Rejected: importing historical PASS counts or counting rendering errors as kills.
full={'candidate':S['testHead'],'catalog':582,'executed':494,'caughtAtIntendedGuard':494,'crashes':0,'retired':m['retired'],'newControls':added,'coverage':coverage,'priorExpectedGuardFile':str(prior),'priorExpectedGuardSha256':hashlib.sha256(prior.read_bytes()).hexdigest(),'records':records}
(RAW/'mutation-reason-audit.json').write_text(json.dumps(full,indent=2)+'\n')
(HERE/'mutation-summary.json').write_text(json.dumps({k:v for k,v in full.items() if k not in ('records','retired','newControls')},indent=2)+'\n')
print('494/494 fresh intended rejections; no crash kills; 88 retired not counted; every one of 15 new rulings has literal and consumer controls')
