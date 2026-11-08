# [CX-VX02-4] Why: retain semantic denominators, independently checked hashes and all mismatches.
# Rejected: converting command completion into acceptance or erasing engine-error controls.
from pathlib import Path
import json,hashlib,datetime,subprocess
r=Path(__file__).resolve().parent;t=r/'target'
load=lambda n:json.loads((r/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
g=load('G0-receipt.json');d=load('grammar-review.json');s=load('spot.json');o=load('check-offline.json')
assert g['git']['head']=='416d84e6d4870a9902e122f0aa873facf2f0f997' and not g['git']['dirty']
assert g['verdict']=='PASS' and g['counts']['pass']==967 and g['counts']['unexpectedSkip']==0
for f in load('frozen-probe-inputs.json')['tools']:assert sha(r/f['path'])==f['sha256']
assert all(x['matches'] for x in load('author-manifest-audit.json'))
summary={'target':g['git']['head'],'verdict':'FIX-FIRST','G0':{'id':g['runId'],'counts':g['counts'],'git':g['git']},'groups':{},'unsafeGroups':{},'spot':[],'offlineBoundaryControls':o['controls']}
for origin in sorted({x['origin']for x in d['safe']}):
 rows=[x for x in d['safe']if x['origin']==origin]
 summary['groups'][origin]={'total':len(rows),'publicRawMatch':sum(x['match']for x in rows),'supportedFalseRefusals':[x['name']for x in rows if x['engineSupported']and not x['guard']['accepted']],'engineErrors':[{'name':x['name'],'error':x['rawError']}for x in rows if 'rawError'in x],'otherMismatches':[{'name':x['name'],'exit':x['exit'],'rawRows':x.get('rawRows')}for x in rows if x['engineSupported']and x['guard']['accepted']and not x['match']]}
for origin in sorted({x['origin']for x in d['unsafe']}):
 rows=[x for x in d['unsafe']if x['origin']==origin]
 summary['unsafeGroups'][origin]={'total':len(rows),'typedPredispatchRefusals':sum(x['pass']for x in rows),'falseAdmissions':[x for x in rows if not x['pass']]}
summary['spot']=[{'name':x['name'],'guard':x['guard'],'rawRows':x.get('rawRows'),'rawError':x.get('rawError'),'defect':x['defect']}for x in s['controls']]
(r/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
productDiff=subprocess.check_output(['git','-C',str(t),'diff','416d84e','--','packages','pnpm-lock.yaml'],text=True);assert not productDiff
files=[p for p in r.rglob('*')if p.is_file()and 'target'not in p.relative_to(r).parts and p.name not in ['manifest.json','collection.log']]
m={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':g['git']['head'],'productDiff':productDiff,'files':[{'path':str(p.relative_to(r)),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(files)],
 'sourceAndBuildFiles':[{'path':str(p.relative_to(t)),'bytes':p.stat().st_size,'sha256':sha(p)}for base in ['packages/core/src','packages/core/dist','packages/xtdb/src','packages/xtdb/dist','packages/qualification/src','packages/qualification/dist','packages/testkit/dist']for p in sorted((t/base).rglob('*'))if p.is_file()],
 'pnpmShimSha256':sha(t/'lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm'),'lockfileSha256':sha(t/'pnpm-lock.yaml'),
 'report':{'path':'../VERIFY-round4.md','sha256':sha(r.parent/'VERIFY-round4.md')},'retainedDetachedTarget':'target/'}
(r/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k not in ['G0','spot','offlineBoundaryControls']},indent=2))
