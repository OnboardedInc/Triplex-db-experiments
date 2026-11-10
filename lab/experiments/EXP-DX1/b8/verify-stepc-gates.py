# [DX-B8-C] Why: require exact source, complete original cases, fresh verification and an independent zero-cache oracle.
# Rejected: a prototype unit pass, an unadmitted job or an aggregate exit status as final qualification.
import hashlib,json,pathlib
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8')
stage=root/'step-c-v6/gateway'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(name):return (root/name).read_text()
def attempt(prefix):
 dirs=[p for p in root.glob(prefix+'-*') if p.is_dir()]
 windows=[p for p in dirs if (p/'cleanup.json').exists()];stacks=[p for p in dirs if (p/'stack.json').exists()]
 assert len(windows)==len(stacks)==1,(prefix,windows,stacks)
 w,s=windows[0],stacks[0];cleanup=json.loads((w/'cleanup.json').read_text());metadata=json.loads((s/'stack.json').read_text())
 assert cleanup['childExitCode']==0 and cleanup['containersAndNetworksEmpty'] and cleanup['heldSeconds']<=900
 assert metadata['prefix']==prefix and len({c['id'] for c in metadata['containers']})==4
 manifest=s/'gateway-files.json';assert sha(manifest)==metadata['gatewaySourceSha256']
 for name,digest in json.loads(manifest.read_text()).items():assert sha(stage/name)==digest,(prefix,name)
 return {'window':str(w),'stack':str(s),'cleanup':cleanup,'sourceSha256':metadata['gatewaySourceSha256']}
for p in pathlib.Path('packages/datomic/gateway').rglob('*'):
 if p.is_file():assert sha(p)==sha(stage/p.relative_to('packages/datomic/gateway')),str(p)
short='tx2-dxb8-stepc-v6-shortdiff';full='tx2-dxb8-stepc-v6-full';race='tx2-dxb8-stepc-v6-race'
short_log=read('stepc-v6-shortdiff.log')
for count in [29,53715,85,26,6,8]:assert f'"pass":{count},"fail":0,"error":0' in short_log,count
base=read(short+'-base.log');assert '23 passed (23)' in base and '179 passed (179)' in base and '177 passed | 2 skipped (179)' in base
assert read(short+'-base.exit-code').strip()=='0'
for layout in ['legacy','lean']:
 s=read(full+'-'+layout+'.log');assert '4 passed (4)' in s and '9 passed (9)' in s
 assert '3200' in s and '5120' in s and '10000' in s and '2000' in s
states=[428278297,-711779450,1425974214,-1699957524];comparisons=closures=0
for i,first in enumerate([0,100,200]):
 s=read(short+f'-diff-{first}.log');rows=[json.loads(line) for line in s.splitlines() if line.startswith('{"firstScenario"')]
 assert len(rows)==1;r=rows[0]
 assert (r['firstScenario'],r['scenarios'],r['inputRandomState'],r['finalRandomState'],r['randomDraws'])==(first,100,states[i],states[i+1],121*(first+100))
 assert '2 passed (2)' in s and read(short+f'-diff-{first}.exit-code').strip()=='0'
 comparisons+=r['comparisons'];closures+=r['rowClosures']
assert comparisons==95028 and closures==5664
stats=json.loads(read(short+'-cache-stats.json'))['entityCache']
assert stats['verify'] and stats['hits']>0 and stats['verificationErrors']==0
assert stats['verified']>=stats['hits']+stats['revisionHits']+stats['recentHits']
assert stats['recentVerified']==stats['recentHits'] and stats['bytes']<=stats['budgetBytes']
assert stats['recentBytes']<=stats['recentBudgetBytes']
race_report=root/race/'driver/report-revision-race.json';r=json.loads(race_report.read_text())
assert [v['layout'] for v in r['layouts']]==['legacy','lean']
for v in r['layouts']:
 assert v['writerCommits']==1200 and v['finalPosition']==v['seedPosition']+1200 and v['comparisons']>=8000
 c,o=v['cached'],v['uncached'];assert c['verify'] and c['recentHits']>0 and c['recentVerified']==c['recentHits']
 assert c['verificationErrors']==0 and c['verified']>=c['hits']+c['revisionHits']+c['recentHits'] and c['bytes']<=c['budgetBytes']
 assert all(o[k]==0 for k in ['budgetBytes','bytes','hits','revisionHits','recentHits'])
 transcript=root/race/'driver'/f'report-revision-race-{v["layout"]}.ndjson'
 rows=[json.loads(line) for line in transcript.read_text().splitlines()];assert sum(row['kind']=='commit' for row in rows)==1200
 samples=[row for row in rows if row['kind']=='comparison'];assert len(samples)==v['comparisons']
 assert all(row['scope']==v['scope'] and row['actualSha256']==row['expectedSha256'] for row in samples)
result={'kind':'Step C developer gate union; not acceptance','attempts':{p:attempt(p) for p in [short,full,race]},'nativeAssertions':53869,'base':{'legacy':179,'lean':177,'expectedLeanSkips':2},'longTestsPerLayout':9,'scenarios':300,'comparisons':comparisons,'rowClosures':closures,'rngStates':states,'cache':stats,'race':r,'gatewayFiles':{str(p.relative_to(stage)):sha(p) for p in stage.rglob('*') if p.is_file()}}
(root/'stepc-v6-gate-union.json').write_text(json.dumps(result,indent=2)+'\n')
print('Step C source-bound gate union passed; not acceptance')
