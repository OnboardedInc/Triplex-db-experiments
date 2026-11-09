"""EXP-O06 round 3: retained behavioral witnesses for Q70E/H/I/K/L."""
import copy
import json
from pathlib import Path
import unittest

from lab.oracles.replay import run as R, values as V
from .helpers import evaluate, result, i64

FIXTURES=Path(__file__).resolve().parents[3]/'experiments/EXP-O06/round3/fixtures'


def fixture(name):
    return json.loads((FIXTURES/(name+'.json')).read_text())


def mark(t=200):
    return {'_tag':'ErasedValue','erasedAt':t}


def journal_values(node):
    alts=node['acceptable'] if 'acceptable' in node else [{'erasuresSeen':'plain','result':node}]
    return [(a['erasuresSeen'],[c['value'] for tx in a['result']['transactions'] for c in tx['changes'] if 'value' in c]) for a in alts]


def values_in(node):
    if isinstance(node,dict):
        if node.get('type')=='integer' or node.get('_tag')=='ErasedValue':return [node]
        return [v for child in node.values() for v in values_in(child)]
    if isinstance(node,list):return [v for child in node for v in values_in(child)]
    return []


class Q70Coverage(unittest.TestCase):
    def test_Q70E_only_issuing_prefixes(self):
        # [EXP-O06] Why: distinguish terminal/error prefixes at the primitive boundary. Rejected: public pages with identical tokens.
        f=fixture('Q70E'); obj=object.__new__(R.Run)
        answers=[('error' if 'error' in a else 'result',V.OrderedOut(a.items())) for a in f['answers']]
        record={'start':1,'scope':'s','answers':[([(2,'tx:2'),(3,'tx:3')][:n],a) for n,a in enumerate(answers)],'kind':'entityPage','key':()}
        obj.read_log=[record]
        spec=R.CONTINUATIONS['entityPage']
        source,predicate=obj.issuing_read(lambda a:f['token'] in R.issued_values(spec,a),lambda r:True,'literal token')
        self.assertIs(source,record)
        self.assertEqual([predicate(a) for a in answers],f['expectedIssuing'])
        self.assertEqual([seen for seen,a in source['answers'] if predicate(a)],[[]])

    def test_Q70H_equal_view_different_bodies(self):
        report=evaluate(fixture('Q70H'))
        self.assertNotEqual(result(report,'a')['transactions'],result(report,'b')['transactions'])
        self.assertEqual((result(report,'a')['next'],result(report,'b')['next']),(2,2))
        c=result(report,'c')
        self.assertNotIn('error',c)
        self.assertEqual([t['position'] for t in c['transactions']],[3])
        self.assertEqual(c['next'],3)
        self.assertEqual(c['transactions'][0]['changes'][0]['op'],'erase')

    def test_Q70I_journal_ambiguity_and_scope(self):
        c=fixture('Q70I')
        for reverse in (False,True):
            qs=c['queries']; probe=copy.deepcopy(c)
            if reverse:probe['queries']=[qs[1],qs[0],qs[2]]
            error=result(evaluate(probe),'c')
            self.assertIn('error',error)
            self.assertEqual(error['error'],'X-NOT-MODELED')
            self.assertIn('ambiguous journal after',error['message'])
        # [EXP-O06] Why: t's own in-flight view must differ from s's plain issuer. Rejected: a cross-scope control whose output collapses.
        report=evaluate(fixture('Q70I-scope'))
        self.assertEqual(journal_values(result(report,'c')),[([], [i64(2)]),(['tx:5'],[mark()])])

    def test_Q70K_scope_on_every_scope_surface(self):
        c=fixture('Q70K')
        for default_erasure in (True,False):
            probe=copy.deepcopy(c)
            if not default_erasure:probe['commands'].pop()
            report=evaluate(probe)
            for query in probe['queries']:
                kind=query['kind']; node=result(report,kind)
                with self.subTest(kind=kind,defaultErasure=default_erasure):
                    if kind=='cutCatalog':
                        self.assertEqual([r['command'] for r in node],[0,1,2])
                        self.assertEqual([r['position'] for r in node],[1,2,3])
                        continue  # Erasure does not change catalog data; inspect the read record below.
                    self.assertIn('acceptable',node)
                    self.assertEqual([a['erasuresSeen'] for a in node['acceptable']],[[],['tx:2']])
                    before,after=[values_in(a['result']) for a in node['acceptable']]
                    self.assertIn(i64(1),before)
                    self.assertNotIn(mark(),before)
                    self.assertIn(mark(),after)
                    self.assertNotIn(i64(1),after)
            run=R.Run(V.loads(json.dumps(probe)));run.process();run.run_queries()
            self.assertEqual({record['scope'] for record in run.read_log},{'t'})
        # Only default scope erases: no t read may acquire its prefixes or markers.
        c['commands'].pop(2)
        for q in c['queries']:q['readStart']={'afterCommand':1}
        report=evaluate(c)
        for q in c['queries']:
            node=result(report,q['id']);self.assertNotIn('acceptable',node)
            self.assertNotIn(mark(),values_in(node))

    def test_Q70L_entity_and_scope_key(self):
        c=result(evaluate(fixture('Q70L-entity')),'c')
        self.assertEqual(journal_values(c),[('plain',[mark(),mark()])])
        c=result(evaluate(fixture('Q70L-scope')),'c')
        self.assertEqual(journal_values(c),[([], [i64(1)]),(['tx:5'],[mark()])])
