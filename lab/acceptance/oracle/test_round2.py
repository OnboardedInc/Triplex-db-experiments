"""Q80/Q82 synthetic regressions against authenticated, independently encoded fixtures."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from bundle_fixtures import fixture, raw, sha
import observe
from test_observe import fixtures

CONTRACT = json.loads((HERE.parent/'obligations.json').read_text())

class BundleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='obs-r2-')
        self.addCleanup(self.tmp.cleanup)
        self.case = next(c for c in fixtures() if c['id'] == 'WORK/pass')
        self.e, self.c, self.root, self.key = fixture(self.case, self.tmp.name, CONTRACT)

    def check(self, protocol=None):
        return observe.check(protocol or self.case['protocol'], self.e, CONTRACT, self.c, self.root, self.key)

    def rejected(self):
        result, code = self.check()
        self.assertIn(result['verdict'], ('FAIL', 'REFUSED'), result)
        self.assertIn(code, (1, 2))
        return result

    def test_positive(self):
        self.assertEqual(self.check()[1], 0, self.check())

    def retag(self, kind):
        bundle = json.loads((self.root/'bundle.json').read_bytes())
        sid = kind.split('/')[-1]
        bundle['streams'][0].update(kind=kind, sourceId=sid)
        self.c['streams'][0].update(kind=kind, sourceId=sid)
        self.e['source']['kind'] = kind
        (self.root/'bundle.json').write_bytes(raw(bundle))
        self.c['bundleSha256'] = sha(raw(bundle))

    def test_cr_refused(self):
        self.retag('CR/xtdb/X7')
        self.assertEqual(self.check()[0]['verdict'], 'REFUSED')

    def test_hr_cannot_supply_engine_work(self):
        self.retag('HR/any/HR')
        self.rejected()

    def test_source_id_kind_disagreement(self):
        self.retag('HO/xtdb/X7')
        self.assertIn('source id disagrees', self.rejected()['reasons'][0])

    def test_unknown_ei_subtype(self):
        self.retag('EI-invented/xtdb/X7')
        self.rejected()

    def test_raw_change(self):
        (self.root/'streams/stream-0/0.bin').write_bytes(b'{}')
        self.assertIn('raw chunk mismatch', self.rejected()['reasons'][0])

    def test_record_invention(self):
        self.e['engineWorkUnits']['rowsScanned'] = 0
        self.e['source']['records']['engineWorkUnits']['rowsScanned'] = 0
        self.assertIn('normalized records differ', self.rejected()['reasons'][0])

    def test_wrong_key(self):
        self.key.write_bytes(b'x'*32)
        self.assertIn('HMAC', self.rejected()['reasons'][0])

    def test_missing_witness(self):
        self.c['witnessHeads'] = []
        self.rejected()

    def test_wrong_witness(self):
        self.c['witnessHeads'][0]['headSha256'] = '0'*64
        self.rejected()

    def test_normalizer_hash(self):
        # Both inventories agree, but the executable bytes do not.
        bundle = json.loads((self.root/'bundle.json').read_bytes())
        bundle['streams'][0]['normalizer']['sha256'] = '0'*64
        self.c['streams'][0]['normalizer']['sha256'] = '0'*64
        (self.root/'bundle.json').write_bytes(raw(bundle)); self.c['bundleSha256'] = sha(raw(bundle))
        self.assertIn('normalizer hash mismatch', self.rejected()['reasons'][0])

    def test_envelope_rewrite(self):
        (self.root/'bundle.json').write_bytes(b'{}')
        self.rejected()

    def test_chain_rewrite_with_retained_hash(self):
        path = self.root/'streams/stream-0/0.hdr.json'
        hdr = json.loads(path.read_bytes()); hdr['prevHeaderSha256'] = '0'*64
        path.write_bytes(raw(hdr)); self.c['streams'][0]['chunks'][0]['headerSha256'] = sha(raw(hdr))
        self.assertIn('broken chunk chain', self.rejected()['reasons'][0])

    def test_hmac_after_retained_header_update(self):
        path = self.root/'streams/stream-0/0.hdr.json'
        hdr = json.loads(path.read_bytes()); hdr['tStartReal'] = 1
        path.write_bytes(raw(hdr)); self.c['streams'][0]['chunks'][0]['headerSha256'] = sha(raw(hdr))
        self.assertIn('HMAC', self.rejected()['reasons'][0])

    def test_missing_context(self):
        self.assertEqual(observe.check(self.case['protocol'], self.e, CONTRACT)[0]['verdict'], 'REFUSED')

    def test_threshold_laundering(self):
        self.e['threshold'] = 'T-INCR-WORK'; self.rejected()

    def test_witness_kind_threshold_laundering(self):
        self.c['witnessKind'] = 'incremental'
        self.rejected()

    def test_case_mismatch(self):
        self.c['bindings']['operation'] = 'different-operation'
        self.rejected()

    def test_contract_mismatch(self):
        self.c['contractSha256'] = '0'*64
        self.rejected()

    def test_path_outside_bundle(self):
        self.c['streams'][0]['chunks'][0]['raw'] = '../key'
        self.rejected()

    def test_legacy_reviewer_cases(self):
        # [EXP-O05-R2] Why: retain all original reviewer inputs unchanged from its commit. Rejected: regenerating a convenient subset.
        proc = subprocess.run(['git', 'show', '74d1152:lab/verify/O05/cases.json'], capture_output=True, check=True)
        cases = json.loads(proc.stdout)
        for case in cases:
            with self.subTest(case=case['id']):
                result, code = observe.check(case['protocol'], case['evidence'], CONTRACT)
                self.assertIn(result['verdict'], ('FAIL', 'REFUSED'))
                self.assertNotEqual(code, 0)
        self.assertEqual(len(cases), 177)

class SemanticTests(unittest.TestCase):
    def run_case(self, protocol, change=None, context_change=None):
        case = copy.deepcopy(next(c for c in fixtures() if c['id'] == protocol+'/pass'))
        if change:
            change(case['evidence'])
            from test_observe import seal
            key = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
            seal(case['evidence'], key, case['evidence'][key]['kind'])
        with tempfile.TemporaryDirectory(prefix='obs-semantic-') as tmp:
            e, c, root, key = fixture(case, tmp, CONTRACT)
            if context_change: context_change(c, e)
            return observe.check(case['protocol'], e, CONTRACT, c, root, key)

    def test_exact_ratio_above_half(self):
        def change(e):
            e['engineWorkUnits']['rowsScanned'] = 2**53+1
            e['comparison']['engineWorkUnits']['rowsScanned'] = 2**54
        result, code = self.run_case('WORK', change)
        self.assertEqual(code, 1, result)
        self.assertIn('exact work ratio', result['reasons'][0])

    def test_exact_ratio_above_incremental(self):
        def change(e):
            e['threshold'] = 'T-INCR-WORK'
            e['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'], 0)
            e['comparison']['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'], 0)
            e['engineWorkUnits']['rowsScanned'] = 2**53+1
            e['comparison']['engineWorkUnits']['rowsScanned'] = 100*2**53
        def context(c, e):
            c.update(witnessKind='incremental', selectedThreshold='T-INCR-WORK')
        result, code = self.run_case('WORK', change, context)
        self.assertEqual(code, 1, result)
        self.assertIn('exact work ratio', result['reasons'][0])

    def test_exact_incremental_boundary_passes(self):
        def change(e):
            e['threshold'] = 'T-INCR-WORK'
            e['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'], 0)
            e['comparison']['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'], 0)
            e['engineWorkUnits']['rowsScanned'] = 2**53
            e['comparison']['engineWorkUnits']['rowsScanned'] = 100*2**53
        result, code = self.run_case('WORK', change, lambda c, e: c.update(witnessKind='incremental', selectedThreshold='T-INCR-WORK'))
        self.assertEqual(code, 0, result)

    def test_wait_duration_label(self):
        def change(e):
            e['tRouteStart'] = 16
            e['waitEvents']['end']['t'] = 16
        result, code = self.run_case('WATERMARK', change)
        self.assertEqual(code, 1, result)
        self.assertIn('duration label', result['reasons'][0])

    def test_fault_label(self):
        def change(e):
            obj = e['transitions'][0]['durableEvidenceObject']
            obj['record'].pop('facts')
            obj['sha256'] = sha(raw(obj['record']))
        result, code = self.run_case('FAULT-TRANSITIONS', change)
        self.assertNotEqual(code, 0, result)

    def test_blind_scanner(self):
        result, code = self.run_case('ERASURE-SCAN', lambda e: e['scans'][-1]['positiveControl'].update(hits=0))
        self.assertEqual(code, 2, result)
        self.assertIn('scanner blind', result['reasons'][0])

    def test_one_safety_kind(self):
        result, code = self.run_case('NO-MUTATION', context_change=lambda c, e: e.pop('corroboration'))
        self.assertEqual(code, 1, result)
        self.assertIn('two independent', result['reasons'][0])

    def test_safety_disagreement(self):
        def change(c, e):
            e['corroboration'][0]['records']['engineMutationCounterAfter'] = 13
        result, code = self.run_case('NO-MUTATION', context_change=change)
        self.assertNotEqual(code, 0, result)

if __name__ == '__main__':
    unittest.main()
