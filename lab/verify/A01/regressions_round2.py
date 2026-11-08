"""EXP-A01 round-2 controls using row payloads from the pinned public oracle CLI."""
import copy
import json
from pathlib import Path
import runpy
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
M = runpy.run_path(str(ROOT / 'lab/acceptance/build_contract.py'))
canon = lambda value: json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


class RealPayloads(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # [EXP-A01-R2] Why: real oracle payloads expose wrapper drift that synthetic arrays missed. Rejected: hand-authoring the expected result shape (F1).
        case = {'format': 'triplex-db-2/o-replay-case/1', 'caseId': 'round2-real-payloads', 'defaultScope': 's',
                'commands': [{'clock': 1, 'operations': [
                    {'op': 'assert', 'ref': 'a' + str(i), 'entityId': 'e' + str(i), 'attribute': ':amount',
                     'value': {'type': 'integer', 'value': str(i)}, 'validFrom': 0} for i in (1, 2)]}],
                'queries': [{'id': 'sum', 'kind': 'aggregate', 'cut': {'validAt': 0},
                             'match': {'attributes': {'amt': ':amount'}}, 'groupBy': ['amt'],
                             'aggregates': [{'op': 'sum', 'var': 'amt', 'as': 'total'}]},
                            {'id': 'match', 'kind': 'match', 'cut': {'validAt': 0}, 'pattern': {'attribute': ':amount'}}]}
        path = HERE / 'round2-real-input.json'
        path.write_bytes(canon(case) + b'\n')
        proc = subprocess.run([sys.executable, '-I', '-B', str(ROOT / 'lab/oracles/replay/cli.py'), str(path)], capture_output=True)
        if proc.returncode:
            raise AssertionError(proc.stderr)
        report = json.loads(proc.stdout)
        cls.payloads = [q['result'] for q in report['queries']]
        (HERE / 'round2-real-answer.json').write_bytes(canon(report) + b'\n')

    def answer(self, payload, inflight):
        q = {'id': 'q', 'kind': 'query'}
        q.update({'inFlight': {'rule': 'prefix', 'acceptable': [{'erasuresSeen': [], 'result': payload}]}} if inflight else {'result': payload})
        return {'commandOutcomes': [], 'state': {}, 'queries': [q]}

    def compare(self, a, b, comp='CMP-BAG-ROWS'):
        return M['reference_compare'](comp, canon(a), canon(b))

    def test_real_rows_reorder_and_metadata_stays_exact(self):
        for payload in self.payloads:
            fields = ['rows'] if 'rows' in payload else ['raw', 'snapshot']
            for inflight in (False, True):
                changed = copy.deepcopy(payload)
                for field in fields:
                    self.assertEqual(len(changed[field]), 2)
                    changed[field].reverse()
                a, b = self.answer(payload, inflight), self.answer(changed, inflight)
                self.assertTrue(self.compare(a, b))
                self.assertFalse(self.compare(a, b, 'CMP-ORDERED-ROWS'))
                changed['cut'] = {'different': True}
                self.assertFalse(self.compare(a, self.answer(changed, inflight)))

    def test_match_count_and_contract_remain_exact(self):
        payload = self.payloads[1]
        for key, value in (('count', 999), ('contract', 'different')):
            changed = dict(payload, **{key: value})
            self.assertFalse(self.compare(self.answer(payload, False), self.answer(changed, False)))

    def test_partial_or_unknown_wrappers_fail_closed(self):
        for payload in ({'cut': {}, 'otherRows': [[1]]}, {'raw': [[1]]}, {'rows': 'wrong-shape'}):
            a = self.answer(payload, False)
            self.assertFalse(self.compare(a, a))

    def test_unicode_comparators_and_codepoint_distinctions(self):
        for comp in ('CMP-SET-ROWS', 'CMP-BAG-ROWS', 'CMP-ORDERED-ROWS'):
            for inflight in (False, True):
                a = self.answer({'cut': {}, 'rows': [{'text': 'café 東京 😀'}]}, inflight)
                self.assertTrue(self.compare(a, a, comp))
                self.assertFalse(self.compare(self.answer([['é']], inflight), self.answer([['e\u0301']], inflight), comp))

    def test_datomic_identity_bound_but_image_unpinned(self):
        comp = {k: {'engine': 'datomic', 'imageDigest': 'unqualified', 'configSha256': 'cfg', 'slot': 'dev'} for k in M['COMPOSITION']['assignments']}
        comp['source']['variant'] = 'engine-source'
        self.assertTrue(M['composition_ok'](comp))
        answer = json.loads(M['contract_oracle_answer'](canon({'composition': comp}), M['contract_oracle_projection']()))
        self.assertTrue(answer['bound'])
        self.assertFalse(answer['imagesPinned'])
        comp['source']['engine'] = 'unknown'
        self.assertFalse(M['composition_ok'](comp))


if __name__ == '__main__':
    unittest.main(verbosity=2)
