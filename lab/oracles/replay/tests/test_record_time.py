"""EXP-O06: independent R33 4.3 / Q90 reference and first-failure controls."""
import copy
import importlib.util
import json
import math
import unittest
from pathlib import Path

from lab.oracles.replay import stamps as S, values as V
from .helpers import evaluate, result

ROOT = Path(__file__).resolve().parents[3] / 'experiments/EXP-O06'
BASE = json.loads((ROOT / 'fixtures/G9-CUT-02b.json').read_text())['case']


class RecordTimeTests(unittest.TestCase):
    def test_authored_fixtures(self):
        spec = importlib.util.spec_from_file_location('o06_fixture_runner', ROOT / 'fixture_runner.py')
        runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(runner)
        for path in (ROOT / 'fixtures').glob('*.json'):
            with self.subTest(fixture=path.name):
                fixture = json.loads(path.read_text())
                self.assertEqual(runner.check(fixture)['verdict'], fixture['wanted'])

    def test_staged_rows_and_record_rows_are_distinct(self):
        report = evaluate(copy.deepcopy(BASE))
        self.assertEqual(report['verdict'], 'PASS')
        row = result(report, 'at-second')['raw'][0]
        self.assertEqual((row['validFrom'], row['recordedAt']), (500, 500.001))

    def test_raw_journal_v2_and_valid_time(self):
        c = copy.deepcopy(BASE)
        c['queries'] = [{'id':'j', 'kind':'journalFacts'}]
        report = evaluate(c)
        facts = result(report, 'j')['facts']
        changes = [f for f in facts if f['attribute'] == ':_tx/change']
        self.assertTrue(changes)
        for fact in changes:
            self.assertEqual(fact['validFrom'], 500)
            payload = fact['value']['value']
            self.assertNotIn('retractedAt', payload)
            if payload['op'] == 'assert':
                self.assertNotIn('recordedAt', payload)
            else:
                self.assertEqual(payload['recordedAt'], 500)
        # Hydrated transaction changes retain public record times (R-JNL-1 is unchanged).
        self.assertEqual(report['state'][0]['transactions'][1]['changes'][0]['retractedAt'], 500.001)

    def test_raw_journal_assert_retract_in_one_transaction(self):
        c = copy.deepcopy(BASE)
        c['commands'] = c['commands'][:1]
        c['commands'][0]['operations'].append({'op':'retract','target':'a'})
        c['receipts'] = c['receipts'][:1]
        c['receipts'][0]['assertionIds'].append(None)
        c['queries'] = [{'id':'j','kind':'journalFacts'}]
        facts = result(evaluate(c), 'j')['facts']
        for f in facts:
            if f['attribute'] == ':_tx/change':
                self.assertNotIn('recordedAt', f['value']['value'])
                self.assertNotIn('retractedAt', f['value']['value'])

    def test_expected_only_reference_and_groups(self):
        c = copy.deepcopy(BASE); c.pop('receipts')
        report = evaluate(c)
        self.assertEqual(report['verdict'], 'EXPECTED-ONLY')
        self.assertEqual(report['state'][0]['transactions'][1]['instant'], 500.001)
        for cmd in c['commands']: cmd['physicalGroup'] = 'outer'
        c['queries'] = []
        txs = evaluate(c)['state'][0]['transactions']
        self.assertEqual([t['instant'] for t in txs], [500,500])

    def test_scopes_and_race_order(self):
        c = copy.deepcopy(BASE)
        for cmd in c['commands']: cmd['race'] = 'race'
        # Independent operations let receipt order differ from submission order.
        c['commands'][1]['operations'] = [c['commands'][1]['operations'][1]]
        c['receipts'][1]['assertionIds'] = ['B']
        c['receipts'][0]['position'], c['receipts'][1]['position'] = 2,1
        c['receipts'][0]['instant'], c['receipts'][1]['instant'] = 500.001,500
        c['queries'] = []
        self.assertEqual(evaluate(c)['verdict'], 'PASS')
        c = copy.deepcopy(BASE)
        c['commands'][1]['scope'] = 'other'
        c['commands'][1]['operations'] = [c['commands'][1]['operations'][1]]
        c['receipts'][1].update(position=1,instant=500,assertionIds=['B'])
        c['queries'] = []
        self.assertEqual(evaluate(c)['verdict'], 'PASS')

    def test_non_clock_driven_still_checks_order(self):
        c = copy.deepcopy(BASE); c['adapter']['clockDriven'] = False
        c['receipts'][1]['instant'] = 501
        c['queries'] = []
        self.assertEqual(evaluate(c)['verdict'], 'PASS')
        c['receipts'][1]['instant'] = 499
        self.assertEqual(evaluate(c)['verdict'], 'FAIL')

    def test_exact_stamp_boundaries(self):
        for stamp in [0,1,500001,2**51+17,2**52+3,S.LIMIT-2,S.LIMIT-1]:
            n = S.instant_of(stamp)
            self.assertEqual(S.stamp_of(n),stamp)
            self.assertEqual(S.stamp_cut(n),stamp)
            if stamp:
                before = V.Num(math.nextafter(n.float,-math.inf))
                self.assertLess(S.stamp_cut(before),stamp)
        with self.assertRaises(V.OracleInputError): S.instant_of(S.LIMIT)
        with self.assertRaises(V.OracleInputError): S.stamp_of(V.Num(500.0001))

    def test_basis_gate_boundaries_and_unbound_read(self):
        c = copy.deepcopy(BASE)
        c['queries'] = [{'id':'q','kind':'match','readStart':1,'cut':{'recordedAt':500,'validAt':500}}]
        self.assertEqual(result(evaluate(c),'q')['count'],1)
        c['queries'][0]['cut']['recordedAt'] = 500.001
        self.assertEqual(result(evaluate(c),'q')['error'],'E-BASIS-NOT-AVAILABLE')
        c['queries'][0].pop('readStart')
        self.assertEqual(result(evaluate(c),'q')['count'],1)
        c['queries'][0]['cut']['recordedAt'] = 501
        self.assertEqual(result(evaluate(c),'q')['axis'],'recordedAt')
        c['queries'][0]['cut'].pop('recordedAt')
        self.assertEqual(result(evaluate(c),'q')['count'],1)

    def test_envelope_instant_remains_not_modeled(self):
        c = copy.deepcopy(BASE)
        c['queries'] = [{'id':'q','kind':'match','cut':{'validAt':500},'pattern':{'attribute':':_tx/instant'}}]
        self.assertEqual(result(evaluate(c),'q')['error'],'X-NOT-MODELED')


class ReviewRound2Tests(unittest.TestCase):
    def reproduction(self, name):
        return json.loads((ROOT / 'round2/reviewer/reproductions' / (name + '.case.json')).read_text())

    def test_cross_ordinal_raw_json_omits_physical_own_instant(self):
        c = self.reproduction('cross-ordinal-journal-own-instant')
        report = evaluate(c)
        self.assertEqual(report['verdict'], 'PASS')
        facts = result(report, 'j')['facts']
        for fact in facts:
            if fact['attribute'] == ':_tx/change':
                payload = fact['value']['value']
                self.assertNotIn('recordedAt', payload)
                self.assertNotIn('retractedAt', payload)
                canonical = json.loads(fact['value']['canonical'])
                self.assertNotIn('recordedAt', canonical)
                self.assertNotIn('retractedAt', canonical)
        hydrated = report['state'][0]['transactions'][1]['changes'][0]
        self.assertEqual((hydrated['recordedAt'], hydrated['retractedAt']), (500,500))
        # The older distinct-transaction case must retain its historical recordedAt.
        older = evaluate(self.reproduction('staged-valid-time-and-journal'))
        changes = [f['value']['value'] for f in result(older,'j')['facts'] if f['attribute']==':_tx/change']
        self.assertEqual(changes[0]['recordedAt'],500)
        self.assertNotIn('retractedAt',changes[0])

    def test_resolved_lost_ack_receipt_only_staging(self):
        committed = self.reproduction('resolved-receipt-false')
        resolved = self.reproduction('resolved-receipt-true')
        for driven in (False, True):
            committed['adapter']['clockDriven'] = resolved['adapter']['clockDriven'] = driven
            a,b = evaluate(committed),evaluate(resolved)
            self.assertEqual((a['verdict'],b['verdict']),('PASS','PASS'))
            self.assertEqual(a['state'],b['state'])
            self.assertEqual(a['receiptConsistency'],b['receiptConsistency'])
        resolved['receipts'][1]['replays']=[{'instant':501}]
        self.assertEqual(evaluate(resolved)['verdict'],'FAIL')

    def test_far_future_query_is_typed_and_storage_bound_is_strict(self):
        c = self.reproduction('large-future-refusal')
        for t in (2 ** 43, 2 ** 44, 1e100, float.fromhex('0x1.fffffffffffffp+1023')):
            c['queries'][0]['cut']['recordedAt'] = t
            report=evaluate(c)
            self.assertEqual(report['verdict'],'PASS')
            error=report['queries'][0]['error']
            self.assertEqual((error['error'],error['axis']),('E-BASIS-NOT-AVAILABLE','recordedAt'))
        c['queries']=[]
        c['receipts'][1]['instant']=2 ** 43
        report=evaluate(c)
        self.assertEqual(report['verdict'],'FAIL')
        self.assertIn('R-RCP-9',[v['rule'] for v in report['receiptConsistency']['violations']])
