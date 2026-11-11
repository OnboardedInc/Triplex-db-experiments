# [DX-B9] Why: a developer gate union requires fresh content counts, exact source and each child exit.
# Rejected: promoting an outer exit code, stale PASS text or a source hash without its immutable bytes.
import hashlib,json,pathlib,re,sys
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9')
prefix=sys.argv[1]; full=sys.argv[2]; stage=pathlib.Path(sys.argv[3])
assert prefix.startswith('tx2-dxb9-') and full.startswith('tx2-dxb9-')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(s):return (root/(prefix+s)).read_text()
windows=[p for p in root.glob(prefix+'-*') if (p/'cleanup.json').exists()]
stacks=[p for p in root.glob(prefix+'-*') if (p/'stack.json').exists()]
assert len(windows)==len(stacks)==1,(windows,stacks)
w,s=windows[0],stacks[0]
cleanup=json.loads((w/'cleanup.json').read_text());meta=json.loads((s/'stack.json').read_text())
assert cleanup['childExitCode']==0 and cleanup['heldSeconds']<=1200 and cleanup['containersAndNetworksEmpty']
assert not (root/(prefix+'-cleanup.txt')).read_text().strip()
assert not (w/'volumes-retained.txt').read_text().strip()
assert meta['prefix']==prefix and len({x['id'] for x in meta['containers']})==4
assert all(x['name'].startswith(prefix+'-') for x in meta['containers'])
assert sha(s/'gateway-files.json')==meta['gatewaySourceSha256']
for name,digest in json.loads((s/'gateway-files.json').read_text()).items():assert sha(stage/name)==digest,(name,'stage mismatch')
for p in pathlib.Path('packages/datomic/gateway').rglob('*'):
 if p.is_file():assert sha(p)==sha(stage/p.relative_to('packages/datomic/gateway')),(str(p),'working source changed')
# [DX-B9-A] Why: gates also execute the SDK/tests; gateway identity alone cannot bind those bytes.
# Rejected: checking only the captured gateway while live decoder or built client bytes drift.
capture=json.loads((stage.parent/'CAPTURE.json').read_text()); sdk_files=0
for relative,receipt in capture.items():
 if relative.startswith(tuple('source/'+p+'/' for p in ['packages/datomic/src','packages/datomic/dist','packages/datomic/test','packages/core/src','packages/core/dist','packages/testkit/src','packages/testkit/dist','packages/w0/src','packages/w0/dist'])):
  captured=stage.parent/relative; current=pathlib.Path(relative.removeprefix('source/'))
  assert sha(captured)==receipt['sha256']==sha(current),(relative,'SDK/test preimage drift')
  sdk_files+=1
assert sdk_files>100
base=read('-base.log');assert '24 passed (24)' in base and '184 passed (184)' in base and '182 passed | 2 skipped (184)' in base
for suffix in ['base','diff-0','diff-100','diff-200']:assert read('-'+suffix+'.exit-code').strip()=='0',suffix
for i,layout in enumerate(['legacy','lean']):
 assert (root/(full+f'-full-{i}.exit-code')).read_text().strip()=='0'
 text=(root/(full+'-'+layout+'.log')).read_text();assert '4 passed (4)' in text and '9 passed (9)' in text
 assert all(n in text for n in ['3200','5120','10000','2000'])
states=[428278297,-711779450,1425974214,-1699957524]; comparisons=closures=0
for i,first in enumerate([0,100,200]):
 text=read(f'-diff-{first}.log');rows=[json.loads(line) for line in text.splitlines() if line.startswith('{"firstScenario"')]
 assert len(rows)==1 and '2 passed (2)' in text
 v=rows[0]
 assert (v['firstScenario'],v['scenarios'],v['inputRandomState'],v['finalRandomState'],v['randomDraws'])==(first,100,states[i],states[i+1],121*(first+100))
 comparisons+=v['comparisons'];closures+=v['rowClosures']
assert (comparisons,closures)==(95028,5664)
# Native suites stream to this fresh hold's outer log; earlier combined runner used a dedicated native log.
native_path=root/(prefix+'-native.log')
if not native_path.exists():native_path=root/(prefix.removeprefix('tx2-dxb9-')+'-window.log')
native=native_path.read_text()
for count in [29,53715,85,26,6,8]:assert f'"pass":{count},"fail":0,"error":0' in native,count
assert 'Testing triplex.gateway.cache-key-test' in native
assert re.search(r':pass 8, :fail 0, :error 0',native)
stats=json.loads(read('-cache-stats.json'))['entityCache']
assert stats['verify'] and stats['hits']>0 and stats['verificationErrors']==0
assert stats['verified']>=stats['hits']+stats['revisionHits']+stats['recentHits']
assert stats['recentVerified']==stats['recentHits'] and stats['bytes']<=stats['budgetBytes']
assert stats['recentBytes']<=stats['recentBudgetBytes']
assert stats['recentHits']==stats['recentVerified']==stats['recentBytes']==0, 'default must not populate recent witnesses'
proxy=json.loads(read('-proxy.json')); assert proxy['peakConnections']<=64
result={'kind':'DX-B9 developer gate union; not acceptance','prefix':prefix,'stack':str(s),'window':str(w),'cleanup':cleanup,'sourceSha256':meta['gatewaySourceSha256'],'nativeAssertions':53877,'base':{'legacy':184,'lean':182,'expectedLeanSkips':2},'longTestsPerLayout':9,'scenarios':300,'comparisons':comparisons,'rowClosures':closures,'rngStates':states,'cache':stats,'gatewayFiles':{str(p.relative_to(stage)):sha(p) for p in stage.rglob('*') if p.is_file()}}
full_windows=[p for p in root.glob(full+'-*') if (p/'cleanup.json').exists()]
full_stacks=[p for p in root.glob(full+'-*') if (p/'stack.json').exists()]
assert len(full_windows)==len(full_stacks)==1
fc=json.loads((full_windows[0]/'cleanup.json').read_text()); fm=json.loads((full_stacks[0]/'stack.json').read_text())
assert fc['childExitCode']==0 and fc['containersAndNetworksEmpty'] and fc['heldSeconds']<=1200
assert fm['prefix']==full and fm['gatewaySourceSha256']==meta['gatewaySourceSha256']
assert not (full_windows[0]/'volumes-retained.txt').read_text().strip()
assert not (root/(full+'-cleanup.txt')).read_text().strip()
full_proxy=json.loads((root/(full+'-proxy.json')).read_text());assert full_proxy['peakConnections']<=64
result['sdkAndTestFilesVerified']=sdk_files
result['longProxy']=full_proxy
result['longAttempt']={'prefix':full,'window':str(full_windows[0]),'stack':str(full_stacks[0]),'cleanup':fc}
(root/(prefix+'-gate-union.json')).write_text(json.dumps(result,indent=2)+'\n')
print('Fresh source-bound developer gates verified; not acceptance')
