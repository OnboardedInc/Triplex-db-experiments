# [CX-VX02-2] Why: retain byte-bound evidence and explicit denominators for this delta review.
# Rejected: relying on wrapper exit codes or historical author PASS claims.
from pathlib import Path
import hashlib,json,subprocess,datetime
r=Path(__file__).resolve().parent
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda n: json.loads((r/n).read_text())
g0=load('G0-receipt.json'); offline=load('offline-source.json'); hazards=load('source-hazards.json'); delta=load('delta-offline.json')
sums=load('source-sums.json'); new_sums=load('delta-sums.json'); live=load('delta-live.json'); subquery=load('subquery-regression.json')
summary={'target':'6cd68dcad31039ceeaec943f0258e1c63a853d48','G0':{k:g0[k] for k in ['verdict','counts','git','toolchain']},
'offline':{'inventory':offline['inventory'],'guards':offline['guards'],'depth':offline['depth'],'matchedSourceMaps':len(offline['maps']),'unsetLanguage':offline['unsetLanguage']},
'hazards':hazards['probes'],'originalSums':{'total':len(sums['controls']),'pass':sum(x['pass'] for x in sums['controls']),'failures':[x for x in sums['controls'] if not x['pass']]},
'deltaOffline':{'overflow':len(delta['overflow']),'exact':len(delta['exact']),'defaults':len(delta['defaults']),'ordinaryDefault':delta['ordinaryDefault']},
'deltaSums':{'total':len(new_sums['controls']),'pass':sum(x['pass'] for x in new_sums['controls']),'failures':[x for x in new_sums['controls'] if not x['pass']]},
'subqueryRegression':{'total':len(subquery['controls']),'confirmed':sum(x['confirmedRegression'] for x in subquery['controls'])},
'deltaLive':{'total':len(live['controls']),'pass':sum(x['pass'] for x in live['controls']),'nonmatchingExpectations':[x for x in live['controls'] if not x['pass']]}}
(r/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
files=[p for p in r.rglob('*') if p.is_file() and 'target' not in p.relative_to(r).parts and p.name!='manifest.json']
manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':subprocess.check_output(['git','-C',str(r/'target'),'rev-parse','HEAD'],text=True).strip(),
'productDiff':subprocess.check_output(['git','-C',str(r/'target'),'diff','6cd68dc','--','packages','pnpm-lock.yaml'],text=True),
'files':[{ 'path':str(p.relative_to(r)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(files)],
'sourceAndBuildFiles':[{ 'path':str(p.relative_to(r/'target')),'bytes':p.stat().st_size,'sha256':sha(p)} for base in ['packages/core/src','packages/core/dist','packages/xtdb/src','packages/xtdb/dist','packages/qualification/src','packages/qualification/dist','packages/testkit/dist'] for p in sorted((r/'target'/base).rglob('*')) if p.is_file()],
'report':{'path':'../VERIFY-round2.md','sha256':sha(r.parent/'VERIFY-round2.md')},'baselineGuardSha256':sha(r/'baseline-ReadOnlySql.ts'),
'lockfileSha256':sha(r/'target/pnpm-lock.yaml'),'retainedDetachedWorktree':'target/','pnpmShim':'target/lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm','pnpmShimSha256':sha(r/'target/lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm')}
(r/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['hazards','offline','G0']},indent=2))
