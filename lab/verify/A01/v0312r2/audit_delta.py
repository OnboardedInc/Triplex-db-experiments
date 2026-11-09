"""Independent content and Git-binding checks for the two contract review rounds."""
from collections import Counter
import copy
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
import time
HERE=Path(__file__).resolve().parent
ROOT=HERE/'scratch'
ACC=ROOT/'lab/acceptance'
BASE='f5e7a413e17948738472d3465bcfdda3b72b2e41'
MERGE='3de54ac5f5ebc6c2c6d12ed902a6cb1ea360d590'
INTEGRATION='b916d5dc809ffc07c57b53a38f1d1deb6bdeeb89'
SOURCE=json.loads((HERE/'source.json').read_bytes())
def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT)
def blob(ref,path):return git('show',ref+':'+path)
def sha(b):return hashlib.sha256(b).hexdigest()
def rows(raw):return [(m[1].decode(),line.decode()) for line in raw.splitlines() if (m:=re.match(rb'^\| (Q\d+[a-z]?)\b',line))]
assert git('rev-parse','HEAD').decode().strip()==SOURCE['merge']
m=runpy.run_path(str(ACC/'build_contract.py'))
d=json.loads((ACC/'obligations.json').read_bytes())
old=json.loads(blob(BASE,'lab/acceptance/obligations.json'))
brief=d['verifierRegistry']['entries']['V-O05-round4']
recovered=blob('4c9077e','lab/verify/A01/v0312/O05-round4-launch-instructions.md')
assert (ROOT/brief['brief']).read_bytes()==recovered
assert sha(recovered)==brief['briefSha256']=='4207182cbbda61f04e9647e1dcde291bdc345dc30f49926abeed6e157e2c1baa'
assert brief['record']==old['verifierRegistry']['entries']['V-O05-round4']['record']
assert (ROOT/brief['record']).read_bytes()==blob(BASE,brief['record'])
proof=brief['briefProvenance']
assert sha((ROOT/proof['record']).read_bytes())==proof['recordSha256']
assert sha((ROOT/proof['lastMessage']).read_bytes())==proof['lastMessageSha256']
assert (ROOT/proof['record']).read_bytes()==blob('4c9077e','lab/verify/A01/v0312/O05-brief-provenance.json')
assert m['verifier_brief_checks']()==[]
variations=[]
entries=m['VERIFIER_REGISTRY']['entries']
for vid,e in entries.items():
    original=copy.deepcopy(e)
    # [CX-VA01-0312R2] Why: matching a substitute's hash must not establish instruction provenance. Rejected: exercising only a wrong-digest negative.
    for kind,path in [('review',brief['record']),('unrelated instructions','lab/verify/O02/BRIEF.md')]:
        if path==original['brief']:continue
        e.update(brief=path,briefSha256=sha((ROOT/path).read_bytes()))
        errors=m['verifier_brief_checks']()
        assert 'Q59c: '+vid+' must hash the original instruction brief, never its review report' in errors
        variations.append({'entry':vid,'kind':kind,'path':path,'errors':errors})
        e.clear();e.update(original)
assert m['verifier_brief_checks']()==[]
# Compare full pending rows, including duplicate IDs, rather than flattening into a map.
parent=git('rev-parse',MERGE+'^1').decode().strip()
before=rows(blob(parent,'lab/acceptance/RULINGS-PENDING.md'))
after=rows((ACC/'RULINGS-PENDING.md').read_bytes())
assert Counter(after)==Counter((i,r) for i,r in before if i not in {'Q88a','Q88b','Q88c'})
auth=rows((ACC/'RULINGS.md').read_bytes())
compiled=[]
for rid in ('Q88a','Q88b','Q88c'):
 raw=next(r for i,r in before if i==rid)
 assert [r for i,r in auth if i==rid]==[raw]
 match=re.match(r'^\| (Q88[a-c])\b([^|]*)\| (.*?) \| (.*?) \|$',raw)
 rule={'topic':match[2].strip(),'rule':match[3],'basis':match[4]}
 assert d['datomicRules'][rid]==rule
 compiled.append({'id':rid,'sourceRow':raw,'consumer':'datomicRules.'+rid})
assert not {i for i,_ in after} & {r['id'] for r in d['rulings']}
assert {'Q78e','Q86g',*('Q89'+x for x in 'abcdefghi'),*('Q90'+x for x in 'abcdefg')} <= {i for i,_ in after}
assert d['pendingRulings']['authority']=='none'
assert d['datomicStoragePolicy']=={'developmentStorage':'dev','developmentEvidence':'DIAGNOSTIC','acceptanceStorage':'postgresql-sql','fsyncOnCommit':True,'peerRole':'SELECT-only','sequencing':['EXP-DA04','EXP-DA03'],'primaryPiiErasure':'crypto-shredding','secondaryPiiErasure':'batched-excision','keysSchema':'separate PostgreSQL schema'}
assert d['oraclePins']==old['oraclePins']
expected_runners=copy.deepcopy(old['oracleRunners'])
expected_runners['O-CONTRACT']['sha256']['lab/acceptance/build_contract.py']=sha((ACC/'build_contract.py').read_bytes())
assert d['oracleRunners']==expected_runners
for path in ('lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','lab/bin/claim.mjs'):
 assert (ROOT/path).read_bytes()==blob(BASE,path)
manifest='lab/config/g0-expected-skips.json'
a=json.loads(blob(BASE,manifest));b=json.loads((ROOT/manifest).read_bytes())
added={k:[x for x in v if x not in a['skips'][k]] for k,v in b['skips'].items()}
assert {k:len(v) for k,v in added.items()}=={'core':0,'testkit':0,'xtdb':3,'qlever':0,'qualification':4}
want=copy.deepcopy(a)
for k,items in added.items():want['skips'][k]+=items
want['counts']['xtdb']+=3;want['counts']['qualification']+=4
want['reasons']={x:('live test; runs in G1 against the shared dev residents (J01, INT-XCJ)' if k=='xtdb' else 'live control; runs in G1 against the shared dev residents (C8, INT-XCJ)') for k,v in added.items() for x in v}
assert b==want
for name in b['reasons']:
 path,label=name.split(' :: ',1)
 test=(ROOT/path).read_text()
 assert 'describe.skipIf' in test and ('XTDB_INTEGRATION' in test or 'QLEVER_INTEGRATION' in test)
 # Exact test names are checked against the fresh G0 assertion inventory by the receipt audit.
parents=git('show','-s','--format=%P',MERGE).decode().strip().split()
assert parents==[parent,INTEGRATION]
atomic=[];hunks=[]
notes={
'qlever-workloads.ts':[
'Import bounded support-path execution helper; no task descriptor or data change.',
'Optional native row cap retains 1000 default; completeness witness for support edges only.',
'Forward chosen cap without changing logical parameters or offered schedule.',
'Support operation remains distinct node-sequence paths; replace three fixed-depth queries with complete edge extraction and general counting.'],
'xtdb-workloads.ts':[
'Comments and imports document native implementations, exact arithmetic, guards and path counting.',
'Reachability interface adds explicit seed source and selector type.',
'Session exposes explicit XTQL/SQL read-only closure implementations; no operation descriptor changes.',
'XTQL typed integer/fact helpers translate existing attribute filters.',
'Native task dispatch, common captured position and seeded frontier traversal implement the same task/cuts; no writes/data/schedule changes.',
'Workload 03 keeps purchase-time and at-purchase price operands and adds XTQL equivalent.',
'Workload 04 keeps claim coordinate, coverage, policy and event-derived valid cut.',
'Workload 05 event count and winning revision unchanged; 06/07 use exact rather than wrapping sums over unchanged operands.',
'Workloads 07-10 preserve inventory subtraction, capture-minus-refund, missing entitlement and deadline/watermark operations; exact errors and SQL null guard repair implementation.',
'Closure tasks 11/13/14/15/20 move to seeded read-only execution; 12 null fix, 16 lineage and 17 ordered conversion retained with XTQL equivalents.',
'Close unchanged 17 assembly; 18 union-duration endpoint segmentation and null guard; 19 shared task execution.',
'Workload 19 prediction/customer/feature-known-at/fraud operands and historical subcuts remain the same.',
'Workload 20 closure relocates above; supports replace length-1..3 approximation with general counting over unchanged edges/from/to/cut.']}
for filename in ('xtdb-workloads.ts','qlever-workloads.ts'):
 path='packages/qualification/src/native/'+filename
 diff=git('diff','f483fb64',INTEGRATION,'--',path)
 (HERE/(filename+'.diff')).write_bytes(diff)
 chunks=re.split(rb'(?=^@@ )',diff,flags=re.M)[1:]
 assert len(chunks)==len(notes[filename]),(filename,len(chunks))
 for i,(chunk,note) in enumerate(zip(chunks,notes[filename])):
  hunks.append({'file':path,'index':i+1,'header':chunk.splitlines()[0].decode(),'sha256':sha(chunk),'changesOperations':False,'changesData':False,'changesSchedule':False,'manualAssessment':note})
 vals=[]
 for ref in (*parents,MERGE):
  c=json.loads(blob(ref,'lab/acceptance/obligations.json'))
  entries={p['path']:p['sha256'] for p in c['caseSets']['CS-PKT71']['pinnedSourceFiles']}
  actual=sha(blob(ref,path));pin=entries[path]
  vals.append({'commit':ref,'actual':actual,'pin':pin})
 assert vals[0]['actual']==vals[0]['pin']==m['WORKLOAD_REPINS_0312'][path]['previousSha256']
 assert vals[1]['pin']==vals[0]['pin'] and vals[1]['actual']==vals[2]['actual']==vals[2]['pin']==sha((ROOT/path).read_bytes())
 assert m['WORKLOAD_REPINS_0312'][path]['sha256']==vals[2]['pin']
 assert {p['path']:p['sha256'] for p in d['caseSourcesPinned']['CS-PKT71']}[path]==vals[2]['pin']
 atomic.append({'path':path,'parentsThenMerge':vals,'reviewedDiffSha256':sha(diff)})
assert len(hunks)==17
packet='qualification/workloads/temporal-workloads.json'
assert blob(BASE,packet)==(ROOT/packet).read_bytes()
assert sha((ROOT/packet).read_bytes())=='322c773db2049b5a704d36925738859aef4982ca27194d13a659d1b0e9081271'
result={'attemptSource':SOURCE,'auditTime':time.time(),'originalBriefSha256':sha(recovered),'briefVariations':variations,'q88':compiled,'pendingRows':after,'skipAdditions':added,'skipReasons':b['reasons'],'atomicRepins':atomic,'hunks':hunks,'packetSha256':sha((ROOT/packet).read_bytes()),'oraclePinsAndExternalRunnersUnchanged':True,'oContractGeneratorHashRefreshed':True,'evaluatorAndAssertionFilesUnchanged':True}
(HERE/'delta-audit.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print('Independent delta audit: exact recovered instructions and substitutions; 3 exact Q88 rows; pending multiset; 7 live skips; atomic two-file repins; 17 manually assessed hunks; frozen packet unchanged')
