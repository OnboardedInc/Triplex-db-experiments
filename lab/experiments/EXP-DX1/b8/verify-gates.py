# [DX-B8] Why: qualify only the explicit completed test slices, exact immutable gateway bytes and original RNG ranges.
# Rejected: treating the first failed native fixture attempt or a zero exit without content checks as a gate union.
import hashlib,json,pathlib,re
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8')
def read(name):return (root/name).read_text()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
base=read('integrated-base.log')
assert 'B8_GATE_COMPONENTS native=1 package=0' in base
assert '23 passed (23)' in base and '179 passed (179)' in base and '177 passed | 2 skipped (179)' in base
native=read('integrated-native.log')
for n in [29,53715,85]:assert f'"pass":{n},"fail":0,"error":0' in native
full={}
for layout in ['legacy','lean']:
 s=read(f'tx2-dxb8-int-full-{layout}.log')
 assert '4 passed (4)' in s and '9 passed (9)' in s,(layout,s[-2000:])
 assert '5000' in s and '10000' in s and '3200' in s and '5120' in s and '2000' in s
 full[layout]={'files':4,'tests':9,'logSha256':sha(root/f'tx2-dxb8-int-full-{layout}.log')}
states=[428278297,-711779450,1425974214,-1699957524];comparisons=fast=0
for i,first in enumerate([0,100,200]):
 s=read(f'tx2-dxb8-int-diff-diff-{first}.log')
 rows=[json.loads(line) for line in s.splitlines() if line.startswith('{"firstScenario"')]
 assert len(rows)==1;r=rows[0]
 assert r['firstScenario']==first and r['scenarios']==100
 assert r['inputRandomState']==states[i] and r['finalRandomState']==states[i+1]
 assert r['randomDraws']==(first+100)*121 and r['drawsPerScenario']==121
 assert '2 passed (2)' in s
 comparisons+=r['comparisons'];fast+=r['fast']
 assert read(f'tx2-dxb8-int-diff-diff-{i}.exit-code').strip()=='0'
assert comparisons==95028 and fast==5664
stats=json.loads(read('tx2-dxb8-int-diff-cache-stats.json'))['entityCache']
assert stats['verify'] and stats['hits']>0 and stats['verified']>=stats['hits']+stats['revisionHits'] and stats['verificationErrors']==0
attempts=['tx2-dxb8-int-base-1794317482','tx2-dxb8-int-native-1794318014','tx2-dxb8-int-diff-1794317623','tx2-dxb8-int-full-1794318044']
for attempt in attempts:
 receipt=json.loads(read(attempt+'/cleanup.json'))
 assert receipt['containersAndNetworksEmpty'] and receipt['heldSeconds']<=900
 assert receipt['childExitCode']==(1 if 'int-base-' in attempt else 0)
 stack=json.loads(read(attempt+'/stack.json'));prefix=attempt.rsplit('-',1)[0]
 assert stack['prefix']==prefix and len(stack['containers'])==4
 assert len({c['id'] for c in stack['containers']})==4
 observed=root/attempt/'gateway-files.json'
 assert sha(observed)==stack['gatewaySourceSha256']
 version='integrated-v2' if 'int-native-' in attempt else 'integrated-v1'
 for name,digest in json.loads(observed.read_text()).items():
  assert sha(root/version/'gateway'/name)==digest,(attempt,name)
for version in ['integrated-v1','integrated-v2']:
 staged=root/version/'gateway/src/triplex/gateway'
 for actual in pathlib.Path('packages/datomic/gateway/src/triplex/gateway').glob('*.clj'):
  if actual.name=='selftest.clj' and version=='integrated-v1':continue
  assert sha(actual)==sha(staged/actual.name),(version,str(actual))
for name in ['tx2-dxb8-int-full','tx2-dxb8-int-diff']:
 assert json.loads(read(name+'-proxy.json'))['peakConnections']<=64
result={'kind':'developer correctness gate union; not acceptance','attempts':attempts,'base':{'legacy':179,'lean':177,'expectedLeanSkips':2},'nativeAssertions':53829,'full':full,'differential':{'scenarios':300,'comparisons':comparisons,'fastRowClosures':fast,'rngStates':states,'cache':stats},'gatewaySha256':{p.name:sha(p) for p in pathlib.Path('packages/datomic/gateway/src/triplex/gateway').glob('*.clj')}}
(root/'integrated-gate-union.json').write_text(json.dumps(result,indent=2)+'\n')
print('Integrated source-bound gate union passed; not acceptance')
