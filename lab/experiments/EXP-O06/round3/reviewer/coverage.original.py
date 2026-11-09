"""CX-VO06-R2: test whether existing assertions detect specific wrong continuation rules."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round2/coverage'
sys.path.insert(0,str(ROOT))
from lab.oracles.replay import run as R, exact as X, values as V
from lab.oracles.replay.tests import test_contract_section4 as T
from lab.oracles.replay.tests.helpers import evaluate,case,result,assert_op,i64

original=R.Run.issuing_read

def apply(name):
    if name=='baseline':return
    if name=='Q70E-unfiltered-prefixes':
        def wrong(self,issued,eligible,what):
            source,predicate=original(self,issued,eligible,what)
            return source,(lambda answer:True) if source is not None else predicate
        R.Run.issuing_read=wrong
    elif name=='Q70H-compare-page-bodies':
        def wrong(self,issued,eligible,what):
            source,predicate=original(self,issued,eligible,what)
            issuers=[r for r in self.read_log if eligible(r) and any(issued(a) for _,a in r['answers'])]
            bodies={tuple(V.dumps(V.OrderedOut([a]),indent=0) for _,a in r['answers'] if issued(a)) for r in issuers}
            if len(bodies)>1:
                raise X.TypedError('X-NOT-MODELED','ambiguous '+what,ruling='CX-VO06 wrong body comparison')
            return source,predicate
        R.Run.issuing_read=wrong
    elif name=='Q70I-choose-ambiguous-journal':
        def wrong(self,issued,eligible,what):
            try:return original(self,issued,eligible,what)
            except X.TypedError:
                if what!='journal after':raise
                issuers=[r for r in self.read_log if eligible(r) and any(issued(a) for _,a in r['answers'])]
                return issuers[-1],issued
        R.Run.issuing_read=wrong
    elif name=='Q70I-ignore-journal-scope':
        R.CONTINUATIONS['transactions']['key']=lambda run,query:()
    elif name=='Q70K-default-nonjournal-scope':
        prior=R.Run.read_scope
        def wrong(self,query):
            if query.get('kind') in ('transaction','transactionByCommand','transactionsForEntity','journalFacts',
                                    'assertions','cutCatalog') or (query.get('kind')=='history' and query.get('cut') is None):
                return self.engine.default_scope
            return prior(self,query)
        R.Run.read_scope=wrong
    elif name=='Q70L-ignore-entity-scope-key':
        R.CONTINUATIONS['transactionsForEntity']['key']=lambda run,q:(q.get('snapshotPosition'),)
    else:raise ValueError(name)

def commands(scope=None,entity='p1'):
    out=[{'clock':100,'operations':[assert_op('s1',entity,':w/pay',i64(1))]},
         {'clock':110,'operations':[assert_op('s2',entity,':w/pay',i64(2))]},
         {'clock':200,'operations':[{'op':'erase','entityId':entity}]}]
    if scope:
        for c in out:c['scope']=scope
    return out

def witness(name):
    if name=='Q70H-compare-page-bodies':
        # [CX-VO06-R2] Why: different limits can reach the same token with the same read view.
        # Rejected: identical duplicate pages (cannot detect accidental page-body equality).
        cmds=commands();qs=[{'id':'a','kind':'transactions','after':0,'limit':2},
              {'id':'b','kind':'transactions','after':1,'limit':1},
              {'id':'c','kind':'transactions','after':2,'limit':1}]
        return evaluate(case(cmds,qs))
    if name=='Q70I-choose-ambiguous-journal':
        qs=[{'id':'a','kind':'transactions','after':0,'limit':1,'readStart':{'afterCommand':1}},
            {'id':'b','kind':'transactions','after':0,'limit':1},
            {'id':'c','kind':'transactions','after':1,'limit':1}]
        return evaluate(case(commands(),qs))
    if name=='Q70I-ignore-journal-scope':
        cmds=commands('s')+commands('t','q1')
        qs=[{'id':'a','kind':'transactions','scope':'s','after':0,'limit':1,'readStart':{'afterCommand':1}},
            {'id':'c','kind':'transactions','scope':'t','after':1,'limit':1}]
        return evaluate(case(cmds,qs))
    if name=='Q70K-default-nonjournal-scope':
        qs=[{'id':'c','kind':'assertions','scope':'t','readStart':{'afterCommand':1}}]
        return evaluate(case(commands('t'),qs))
    if name=='Q70L-ignore-entity-scope-key':
        cmds=commands()
        # Distinct subjects have records at the same shared scope positions only when written together.
        cmds[0]['operations'].append(assert_op('q1','q1',':w/pay',i64(3)))
        cmds[1]['operations'].append(assert_op('q2','q1',':w/pay',i64(4)))
        cmds[2]['operations'].append({'op':'erase','entityId':'q1'})
        qs=[{'id':'a','kind':'transactionsForEntity','entityId':'p1','snapshotPosition':2,'limit':1,
             'readStart':{'afterCommand':1}},
            {'id':'c','kind':'transactionsForEntity','entityId':'q1','snapshotPosition':2,'limit':1,'beforePosition':2}]
        return evaluate(case(cmds,qs))
    if name=='Q70E-unfiltered-prefixes':
        # [CX-VO06-R2] Why: directly distinguish issuing and nonissuing answers in the continuation primitive.
        # Rejected: inventing a product query whose prefixes issue different tokens.
        obj=object.__new__(R.Run)
        a=('result',V.OrderedOut([('nextCursor','token')]))
        b=('result',V.OrderedOut([('nextCursor',None)]))
        rec={'start':1,'scope':'s','answers':[([],a),([(2,'t2')],b)],'kind':'entityPage','key':()}
        obj.read_log=[rec]
        source,predicate=obj.issuing_read(lambda ans:ans[1].get('nextCursor')=='token',lambda r:True,'literal token')
        return {'predicateOnIssuing':predicate(a),'predicateOnNonIssuing':predicate(b)}

names=['Q70E-unfiltered-prefixes','Q70H-compare-page-bodies','Q70I-choose-ambiguous-journal',
       'Q70I-ignore-journal-scope','Q70K-default-nonjournal-scope','Q70L-ignore-entity-scope-key']
if len(sys.argv)>1:
    name=sys.argv[1]
    before=witness(name) if name!='baseline' else None
    apply(name)
    after=witness(name) if name!='baseline' else None
    file=OUT/(name+'.witness.json')
    file.write_text(json.dumps({'mutation':name,'before':before,'after':after,'changed':before!=after},indent=2)+'\n')
    suite=unittest.defaultTestLoader.discover(str(ROOT/'lab/oracles/replay/tests'),top_level_dir=str(ROOT))
    with (OUT/(name+'.tests.log')).open('w') as f:
        res=unittest.TextTestRunner(stream=f,verbosity=1).run(suite)
    rows={'mutation':name,'run':res.testsRun,'failures':[test.id() for test,_ in res.failures],
          'errors':[test.id() for test,_ in res.errors],'witnessChanged':before!=after}
    (OUT/(name+'.result.json')).write_text(json.dumps(rows,indent=2)+'\n')
    print(json.dumps(rows));raise SystemExit(0)
OUT.mkdir(parents=True,exist_ok=False)
sourceFiles=list((ROOT/'lab/oracles/replay').rglob('*.py'))+[Path(__file__)]
pins={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sourceFiles}
(OUT/'inputs.json').write_text(json.dumps(pins,indent=2)+'\n')
for name in ['baseline',*names]:
    p=subprocess.run([sys.executable,'-I',str(Path(__file__)),name],cwd=ROOT,capture_output=True,text=True)
    (OUT/(name+'.process.log')).write_text(p.stdout+p.stderr)
    print(name,p.returncode,flush=True)
    if p.returncode:raise SystemExit(p.returncode)
base=json.loads((OUT/'baseline.result.json').read_text())
rows=[]
for name in names:
    r=json.loads((OUT/(name+'.result.json')).read_text())
    r['sameSuiteFailuresAsBaseline']=r['failures']==base['failures'] and r['errors']==base['errors']
    rows.append(r)
summary={'scope':'diagnostic in-memory wrong implementations; never production source changes',
    'sourceUnchanged':all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==s for p,s in pins.items()),
    'baseline':base,'mutations':rows}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
