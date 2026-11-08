"""CLI boundary, malformed input and contract-authority tests."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from bundle_fixtures import fixture


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='o-obs-cli-')
        self.addCleanup(self.tmp.cleanup)
        self.directory = Path(self.tmp.name)
        self.contract = json.loads((HERE.parent / 'obligations.json').read_text())
        self.case = next(c for c in json.loads((HERE / 'fixtures.json').read_text()) if c['id'] == 'CANCEL/pass')

    def invoke(self, evidence=None, contract=None, raw=None, protocol=None):
        ep = self.directory / 'e.json'; cp = self.directory / 'c.json'
        import shutil
        run = self.directory / 'run'
        if run.exists(): shutil.rmtree(run)
        run.mkdir()
        c = contract or self.contract
        case = dict(self.case, evidence=evidence or self.case['evidence'])
        e, context, bundle, key = fixture(case, run, c)
        ep.write_text(raw if raw is not None else json.dumps(e))
        cp.write_text(json.dumps(c))
        xp = self.directory / 'context.json'; xp.write_text(json.dumps(context))
        proc = subprocess.run([sys.executable, '-I', str(HERE / 'observe.py'), 'check',
                               protocol or self.case['protocol'], str(ep), '--contract', str(cp), '--bundle', str(bundle), '--context', str(xp), '--key-file', str(key)],
                              capture_output=True, text=True, timeout=30)
        self.assertEqual(proc.stderr, '')
        result = json.loads(proc.stdout)
        self.assertEqual(proc.stdout, json.dumps(result, sort_keys=True, separators=(',', ':')) + '\n')
        return proc.returncode, result

    def test_contract_threshold_authority(self):
        contract = copy.deepcopy(self.contract)
        contract['thresholds']['T-DRAIN-MS']['value'] = 1999
        code, verdict = self.invoke(contract=contract)
        self.assertEqual((code, verdict['verdict']), (1, 'FAIL'))
        self.assertEqual(verdict['thresholds']['T-DRAIN-MS']['value'], 1999)

    def test_unknown_fields_and_evidence_threshold_ignored(self):
        e = copy.deepcopy(self.case['evidence'])
        e.update(unknown={'kept': [1, 2]}, thresholds={'T-DRAIN-MS': 9999999})
        self.assertEqual(self.invoke(e)[0], 0)
        e['tDrained'] = 2001
        # [EXP-O05] Why: reseal the independently authored record after changing it. Rejected: only stale-hash rejection.
        records = e['source']['records']; records['tDrained'] = 2001
        import hashlib
        e['source']['sha256'] = hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.assertEqual(self.invoke(e)[0], 1)

    def test_duplicate_key(self):
        self.assertEqual(self.invoke(raw='{"requestId":"a","requestId":"b"}')[0], 2)

    def test_nonfinite(self):
        for token in ('NaN', 'Infinity', '-Infinity', '1e9999'):
            code, result = self.invoke(raw='{"unused":' + token + '}')
            # Overflow in unknown fields must also be rejected by the JSON loader.
            self.assertEqual(code, 2, result)

    def test_wrong_types(self):
        for bad in ([], None, True, 5, 'counter'):
            code, result = self.invoke(raw=json.dumps(bad))
            self.assertEqual((code, result['verdict']), (2, 'REFUSED'))

    def test_unknown_protocol(self):
        self.assertEqual(self.invoke(protocol='OBS-UNDEFINED')[0], 2)

    def test_missing_threshold(self):
        c = copy.deepcopy(self.contract); del c['thresholds']['T-DRAIN-MS']
        code, result = self.invoke(contract=c)
        self.assertEqual((code, result['verdict']), (2, 'REFUSED'))

    def test_sample_numeric_bool(self):
        e = copy.deepcopy(self.case['evidence']); e['engineActiveSamples'][0]['t'] = True
        from hashlib import sha256
        e['source']['records']['engineActiveSamples'][0]['t'] = True
        e['source']['sha256'] = sha256(json.dumps(e['source']['records'], sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.assertEqual(self.invoke(e)[0], 2)


if __name__ == '__main__':
    unittest.main()
