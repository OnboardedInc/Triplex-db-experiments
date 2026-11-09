"""Independent source-row, R36 amendment, retirement and atomic pin checks."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
import time
HERE=Path(__file__).resolve().parent
S=json.loads((HERE/'source.json').read_bytes());R=HERE/'scratch';RAW=Path(S['raw'])
BASE='15927efed3a6dd48d620b19bd0201fe862344b33';MERGE='260d46c715ddd6465894869eeceab08059fcf4ef';INT='6e5dde9778ac689f18bf039aa760969c506a0272'
def git(*a,cwd=R):return subprocess.check_output(['git',*a],cwd=cwd)
def blob(ref,path):return git('show',ref+':'+path)
def sha(b):return hashlib.sha256(b).hexdigest()
def table(text):
 return [line for line in text.splitlines() if line.startswith('| ')]
def ident(line):
 m=re.match(r'^\| (Q\d+[a-z]?(?:-S)?)\b',line)
 return m[1] if m else None
m=runpy.run_path(str(R/'lab/acceptance/build_contract.py'))
d=json.loads((R/'lab/acceptance/obligations.json').read_bytes());old=json.loads(blob(BASE,'lab/acceptance/obligations.json'))
pending=blob(BASE,'lab/acceptance/RULINGS-PENDING.md').decode();authority=(R/'lab/acceptance/RULINGS.md').read_text()
expected={'Q91'+x for x in 'abcd'}|{'Q93'+x for x in 'abc'}|{'Q94'+x for x in 'bcdefghi'}
assert set(m['RULES_0313'])==expected
assert {x['id'] for x in d['rulings']} == ({x['id'] for x in old['rulings']} - {'Q83d','Q83e'}) | expected
literal=[]
for rid in sorted(expected):
 line=next(l for l in table(pending) if ident(l)==rid)
 cells=line[2:-2].split(' | ')
 assert len(cells)==3
 topic=cells[0][len(rid):].strip()
 rule=cells[2] if rid in ('Q93a','Q93b') else cells[1]
 basis='R36 section 6' if rid in ('Q93a','Q93b') else cells[2]
 want={'topic':topic,'rule':rule,'basis':basis}
 dest='qleverEvidenceRules' if rid.startswith('Q91') else 'seedRules' if rid.startswith('Q93') else 'goldenScenarioRulings'
 assert m['RULES_0313'][rid]==d[dest][rid]==want,rid
 assert next(x for x in d['rulings'] if x['id']==rid)['ruling']==rule
 if rid not in ('Q93a','Q93b'):assert line in table(authority)
 literal.append({'id':rid,'pendingRow':line,'consumer':dest+'.'+rid,'exact':True})
# [CX-VA01-0313] Why: independently use R36 proposed text and preserve duplicate pending IDs; the builder's frozen JSON is not the authority for this audit. Rejected: comparing only its copied Boolean review or an ID-keyed dictionary.
r36=(R/'lab/research/R36-k01-simplification.md').read_text()
assert r36==Path('/Users/sam/projects/triplex-db-2/lab/research/R36-k01-simplification.md').read_text()
section=r36.split('## 6. What changes in the rulings')[1].split('## 7.')[0]
proposed={}
for line in table(section):
 cells=line[2:-2].split(' | ')
 if len(cells)!=3:continue
 for rid in re.findall(r'Q\d+[a-z]?',cells[0]):proposed[rid]=cells[2]
changes=[]
for rid,amend in d['seedAmendments'].items():
 expected_text=proposed[rid]
 if rid=='Q74c':expected_text=old['seedRules'][rid]['rule']+' '+expected_text
 assert amend['rule']==expected_text and d['seedRules'][rid]==amend,rid
 changes.append({'id':rid,'r36Proposed':proposed[rid],'appliedRule':amend['rule']})
for rid in ('Q74a','Q74e','Q74f','Q74g'):assert d['seedRules'][rid]==old['seedRules'][rid]
for rid in ('Q92c','Q92g'):
 assert [l for l in table(pending) if ident(l)==rid]==[l for l in table((R/'lab/acceptance/RULINGS-PENDING.md').read_text()) if ident(l)==rid]
for rid in ('Q83d','Q83e'):
 assert rid not in d['seedRules'] and rid not in {x['id'] for x in d['rulings']}
 assert d['retiredSeedRules'][rid]==old['seedRules'][rid]
assert d['seedRules']['Q93a']['rule']==proposed['Q93a'] and d['seedRules']['Q93b']['rule']==proposed['Q93b']
load=json.loads((R/'lab/acceptance/load-contract.json').read_bytes())
assert load['freezeProtocol']==d['freezeProtocol'] and load['seedRules']==d['seedRules']
f=d['freezeProtocol'];assert f['precedence']==['Q93a','Q93b','Q93c'] and 'resumeBoundTo' not in f
assert all(s in f['grant'] for s in ('measuring process','measured endpoint','before warm-up','every run'))
assert 'every stored column' in f['cloneDigest'] and 'D-prime' in f['freshSeedDigest'] and 'engine-source comment and a test' in f['freshSeedDigest']
assert 'deadline' in f['deadlines'] and 'two starts' in f['goldenPublication'] and 'D and L' in f['goldenPublication']
before=Counter(l for l in table(pending) if ident(l) and ident(l) not in expected)
after=Counter(l for l in table((R/'lab/acceptance/RULINGS-PENDING.md').read_text()) if ident(l))
assert before==after
held={ident(l) for l in after}
assert {'Q78e','Q86g','Q94a','Q95-S',*('Q89'+x for x in 'abcdefghi'),*('Q90'+x for x in 'abcdefg'),*('Q92'+x for x in 'abcdefghijk'),*('Q95'+x for x in 'abcdefgh')}<=held
assert not held & {x['id'] for x in d['rulings']} and d['pendingRulings']['authority']=='none'
parents=git('show','-s','--format=%P',MERGE).decode().strip().split();assert parents==[BASE,INT]
path='packages/testkit/src/index.ts';diff=git('diff',BASE,INT,'--',path);(RAW/'testkit-index.diff').write_bytes(diff)
assert len(re.findall(rb'^@@',diff,re.M))==1
prior=blob(BASE,path);current=(R/path).read_bytes();assert current.startswith(prior+b'\n')
assert current==blob(INT,path)==blob(MERGE,path)
oldhash=sha(prior);newhash=sha(current)
pinproof=[]
for ref in (BASE,INT,MERGE,S['candidate']):
 c=json.loads(blob(ref,'lab/acceptance/obligations.json'))
 pins=[c['oracleFilesPinned']['O-TESTKIT'],c['caseSets']['CS-U44']['pinnedSourceFiles'],c['caseSourcesPinned']['CS-U44']]
 want=oldhash if ref in (BASE,INT) else newhash
 assert all(p==[{'path':path,'sha256':want}] for p in pins)
 image=c['imagePins']['datomic'];assert image==({'image':None,'imageId':None} if ref in (BASE,INT) else d['imagePins']['datomic'])
 pinproof.append({'commit':ref,'sourceSha256':sha(blob(ref,path)),'testkitPins':pins,'datomicImage':image})
slots=json.loads((R/'lab/config/slots.json').read_bytes())
assert d['imagePins']['datomic']=={k:slots['lanes']['datomic'][k] for k in ('image','imageId')}
assert d['imagePins']['datomic']=={'image':'tx2-datomic:1.0.7745-da00','imageId':'sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf'}
assert json.loads((R/'lab/acceptance/oracle-contract.json').read_bytes())['imagePins']==d['imagePins']
for lane in ('xtdb','qlever'):assert d['imagePins'][lane]==old['imagePins'][lane]
for cs in ('CS-PKT71',):assert d['caseSourcesPinned'][cs]==old['caseSourcesPinned'][cs]
for unchanged_path in ('qualification/workloads/temporal-workloads.json','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs'):
 assert (R/unchanged_path).read_bytes()==blob(BASE,unchanged_path),unchanged_path
assert d['oraclePins']==old['oraclePins'] and d['verifierRegistry']==old['verifierRegistry']
assert {k for k in d['oracleFilesPinned'].keys()|old['oracleFilesPinned'].keys() if d['oracleFilesPinned'].get(k)!=old['oracleFilesPinned'].get(k)}=={'O-TESTKIT'}
assert {k for k in d['caseSourcesPinned'].keys()|old['caseSourcesPinned'].keys() if d['caseSourcesPinned'].get(k)!=old['caseSourcesPinned'].get(k)}=={'CS-U44'}
assert {k for k in d['oracleRunners'].keys()|old['oracleRunners'].keys() if d['oracleRunners'].get(k)!=old['oracleRunners'].get(k)}=={'O-CONTRACT'}
for rid in ('Q88a','Q88b','Q88c'):assert d['datomicRules'][rid]==old['datomicRules'][rid]
mergeconflict=git('diff','--cc','--','lab/bin/gate.mjs',cwd=HERE/'merged');assert b'<<<<<<< HEAD' in mergeconflict
result={'candidate':S['candidate'],'auditedAt':time.time(),'rules':literal,'amendments':changes,'r36Sha256':sha(r36.encode()),'pendingRawRowCount':sum(after.values()),'pendingExactIds':sorted(held),'generatedPendingIds':d['pendingRulings']['ids'],'pendingDuplicates':{rid:sum(v for line,v in after.items() if ident(line)==rid) for rid in held if sum(v for line,v in after.items() if ident(line)==rid)>1},'pinParentsThenMerge':pinproof,'sourcePin':{'path':path,'oldSha256':oldhash,'newSha256':newhash},'workloadHunkAssessment':'Append-only named re-exports; no measured operation, data, schedule or existing conformance body changes. New exported helper implementation remains code under the accepted integration, not a substituted workload.','mergeConflict':{'main':S['main'],'path':'lab/bin/gate.mjs','regions':len(re.findall(rb'^\+\+<<<<<<< HEAD',mergeconflict,re.M))},'buildContractVerifySeparate':True}
(HERE/'authority-audit.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print('15 exact ruling consumers; 6 literal R36 amendments; 2 retirements; complete pending multiset; atomic image and all 3 testkit projections; one append-only hunk; current-main merge remains conflicted')
