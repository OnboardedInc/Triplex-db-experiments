"""Compare actual immutable merge blobs, not the builder's saved PASS statements."""
from collections import Counter
import hashlib,json,re,subprocess,time
from pathlib import Path
H=Path(__file__).resolve().parent;S=json.loads((H/'source.json').read_bytes());R=H/'scratch';RAW=Path(S['raw'])
A='6b8d2182d78e567cf8e385622c9a259e8892687a';B='9a7996e2a242690edbc86417283d8c7348950adb';M=S['merge']
def git(*args):return subprocess.check_output(['git',*args],cwd=R)
def blob(rev,p):return git('show',rev+':'+p)
def sha(b):return hashlib.sha256(b).hexdigest()
def tree(rev):
 return {p:(mode,digest) for line in git('ls-tree','-r',rev).decode().splitlines() for meta,p in [line.split('\t',1)] for mode,kind,digest in [meta.split()]}
a,b,m=map(tree,[A,B,M]);joint=[p for p in m if m[p]!=a.get(p) and m[p]!=b.get(p)]
expected=['lab/acceptance/ACCEPTANCE.md','lab/acceptance/RULINGS-PENDING.md','lab/acceptance/obligations.json','lab/bin/engine.mjs','lab/bin/gate.mjs','lab/experiments/EXP-A01-acceptance-contract/REPORT-0.3.13.md','lab/experiments/EXP-A01-acceptance-contract/bin/pnpm','lab/experiments/EXP-A01-acceptance-contract/regressions/merge0313-round2.test.mjs']
assert joint==expected,joint
remerge=git('show','--remerge-diff','--format=',M);(RAW/'remerge.diff').write_bytes(remerge)
manual=re.findall(r'^diff --git a/(.*?) b/',remerge.decode(),re.M)
assert manual==[p for p in expected if p not in ['lab/acceptance/RULINGS-PENDING.md','lab/bin/engine.mjs']],manual
for p in ['lab/bin/gate.mjs','lab/bin/engine.mjs']:
 for parent,label in [(A,'candidate'),(B,'main')]:
  (RAW/(Path(p).stem+'-vs-'+label+'.diff')).write_bytes(git('diff',parent,M,'--',p))
for p in ['lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs']:
 assert blob(A,p)==blob(B,p)==blob(M,p),p
x=blob(A,'lab/acceptance/obligations.json');y=blob(M,'lab/acceptance/obligations.json');old,new=map(json.loads,[x,y])
changes=[]
def diff(x,y,p=''):
 if isinstance(x,dict) and isinstance(y,dict):
  assert x.keys()==y.keys(),p
  for k in x:diff(x[k],y[k],p+'/'+k)
 elif x!=y:changes.append(p)
diff(old,new)
assert sorted(changes)==sorted(['/pendingRulings/sha256','/pendingRulings/ids','/inputs/lab/acceptance/RULINGS-PENDING.md','/transitiveContractSha256']),changes
assert new['pendingRulings']['ids']==old['pendingRulings']['ids']+['Q96a','Q96b','Q96c','Q97a','Q97b','Q97c']
rows=lambda data:Counter(l for l in data.decode().splitlines() if re.match(r'^\| Q\d',l))
prior=rows(blob(A,'lab/acceptance/RULINGS-PENDING.md'));merged=rows(blob(M,'lab/acceptance/RULINGS-PENDING.md'));main=rows(blob(B,'lab/acceptance/RULINGS-PENDING.md'))
assert not prior-merged
added=merged-prior;assert sum(added.values())==6
assert all(re.match(r'^\| Q9[67][abc] [^|]*\|',l) and main[l]>=n for l,n in added.items())
for p in ['lab/acceptance/build_contract.py','lab/acceptance/RULINGS.md','lab/acceptance/oracle-contract.json','lab/config/slots.json','lab/config/g0-expected-skips.json','lab/bin/claim.mjs','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','lab/experiments/EXP-A01-acceptance-contract/regressions/negtest0313.py']:
 assert blob(A,p)==blob(M,p)==blob(S['testHead'],p),p
# [CX-VA01-0313-R2] Why: literal equality anchors the entire inherited receipt bodies, beyond sampled assertions. Rejected: trusting merge success or a builder-reported test count as preservation proof.
gate={rev:blob(rev,'lab/bin/gate.mjs').decode() for rev in (A,B,M)}
def section(text,start,end):
 assert text.count(start)==1 and text.count(end)==1,(start,end)
 return text[text.index(start):text.index(end)]
sections={}
for name,start,end,parent in [('W02 GS','async function gateGS','async function gateG4',B),('DA01 step','  async step(','\nasync function build',A)]:
 v=section(gate[M],start,end);assert v==section(gate[parent],start,end);sections[name]={'parent':parent,'sha256':sha(v.encode())}
engine={rev:blob(rev,'lab/bin/engine.mjs').decode() for rev in (A,B,M)}
# QG1 changes from A are exactly the original main changes from the merge base.
base=git('merge-base',A,B).decode().strip()
for label,parent,other in [('QG1',A,B),('DA01',B,A)]:
 def semantic_patch(p,q):
  patch=git('diff','--unified=0',p,q,'--','lab/bin/engine.mjs').decode()
  return [l for l in patch.splitlines() if l[:1] in '+-' and not l.startswith(('+++','---'))]
 assert semantic_patch(parent,M)==semantic_patch(base,other),label
shim='lab/experiments/EXP-A01-acceptance-contract/bin/pnpm'
patch=git('diff',A,M,'--',shim).decode();assert patch.count('\n+')==5 and '\n-' not in patch.replace('\n---','')
assert S['mergeExit']==0 and S['testVsCandidate']==['lab/NOTEBOOK.md','lab/STATE.md']
ct,tt=tree(S['candidate']),tree(S['testHead'])
assert ct.keys()==tt.keys()
assert [p for p in ct if ct[p]!=tt[p]]==S['testVsCandidate']
# Final receipt commit is only documentation and small G0 evidence, not an executable change.
post=git('diff','--name-only',M,S['candidate']).decode().splitlines()
assert all(p=='lab/experiments/EXP-A01-acceptance-contract/REPORT-0.3.13.md' or p.startswith(('lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.13-round2/','lab/runs/G0/')) for p in post)
summary={'checkedAt':time.time(),'candidate':S['candidate'],'merge':M,'parents':[A,B],'testedCurrentMain':S['main'],'testHead':S['testHead'],'parentCompositePaths':joint,'manualResolutionPaths':manual,'obligationsChangedFields':changes,'pendingAddedRows':list(added.elements()),'parentSections':sections,'enginePatchesEqualOriginalParents':True,'unchangedEvaluatorAssertionsAndMutationHarness':True,'postMergeCommitPaths':post,'transitiveContractSha256':new['transitiveContractSha256'],'generatorSha256':sha(blob(M,'lab/acceptance/build_contract.py'))}
(H/'merge-audit.json').write_text(json.dumps(summary,indent=2)+'\n');print('Merge source audit: both parent patches preserved; exactly six manual-resolution paths; six pending additions only')
