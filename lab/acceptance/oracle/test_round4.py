"""Common O-OBS delegation and the repaired contract-derived cancellation control."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import observe
from bundle_fixtures import fixture, raw, sha
from test_observe import fixtures, seal

CONTRACT = json.loads((HERE.parent/'obligations.json').read_text())
POSITIVES = [c for c in fixtures() if c['id'].endswith('/pass')]

class SelectionTests(unittest.TestCase):
    def test_every_protocol_refuses_an_unselected_obligation(self):
        for baseline in POSITIVES:
            with self.subTest(protocol=baseline['protocol']), tempfile.TemporaryDirectory(prefix='obs-r4-context-') as tmp:
                case = copy.deepcopy(baseline)
                if case['protocol']=='OBS-RESOURCE':
                    case['evidence']['obligation']='G1.found.unchanged44'
                    seal(case['evidence'],'source',case['evidence']['source']['kind'])
                e,c,bundle,key = fixture(case,tmp,CONTRACT)
                c.update(obligation='G1.found.unchanged44',case='CS-U44/all')
                report,code = observe.check(case['protocol'],e,CONTRACT,c,bundle,key)
                self.assertEqual((report['verdict'],code),('REFUSED',2),report)
                self.assertIn('obligation does not select O-OBS',report['reasons'][0])

    def test_registered_protocol_and_context_must_match(self):
        for baseline in POSITIVES:
            for mode in ('missing-registration','context-mismatch'):
                with self.subTest(protocol=baseline['protocol'],mode=mode), tempfile.TemporaryDirectory(prefix='obs-r4-protocol-') as tmp:
                    contract=copy.deepcopy(CONTRACT)
                    if mode=='missing-registration': del contract['obsProtocols'][baseline['protocol']]
                    e,c,bundle,key = fixture(baseline,tmp,contract)
                    if mode=='context-mismatch':
                        c['protocol']='OBS-WORK' if baseline['protocol']!='OBS-WORK' else 'OBS-CANCEL'
                    report,code = observe.check(baseline['protocol'],e,contract,c,bundle,key)
                    self.assertEqual((report['verdict'],code),('REFUSED',2),report)
                    self.assertIn('matching registered protocol',report['reasons'][0])

    def test_all_protocol_positives_still_pass(self):
        self.assertEqual(len(POSITIVES),14)
        for case in POSITIVES:
            with self.subTest(protocol=case['protocol']), tempfile.TemporaryDirectory(prefix='obs-r4-positive-') as tmp:
                e,c,bundle,key = fixture(case,tmp,CONTRACT)
                report,code = observe.check(case['protocol'],e,CONTRACT,c,bundle,key)
                self.assertEqual((report['verdict'],code),('PASS',0),report)

class CorrectedCoverageTests(unittest.TestCase):
    def test_same_caller_and_drain_need_both_coverage_repairs(self):
        retained = subprocess.check_output(['git','show','a036359:lab/verify/O05/round2/supplement-evidence/018/evidence.json'])
        original=json.loads(retained); original.pop('source'); original.pop('corroboration')
        schedules = [
            ('original',[100+1000*i for i in range(8)],False,'cover uncertain'),
            ('cadence-only',[100+500*i for i in range(15)],False,'cover uncertain'),
            ('edge-only',[100+1000*i for i in range(8)]+[7600],False,'coverage gap'),
            ('both',[100+500*i for i in range(16)],True,None),
        ]
        for label,ts,passes,reason in schedules:
            with self.subTest(label=label), tempfile.TemporaryDirectory(prefix='obs-r4-coverage-') as tmp:
                e=copy.deepcopy(original)
                # [EXP-O05-R4] Why: repair the positive's cadence and final edge only. Rejected: lowering u or loosening the gate.
                e['engineActiveSamples']=[dict(t=t,activeQueryIds=['query-a'] if t<2100 else []) for t in ts]
                seal(e,'source','engine-active-query-log')
                case=dict(id='CANCEL/corrected-coverage-'+label,protocol='OBS-CANCEL',evidence=e)
                encoded,c,bundle,key = fixture(case,tmp,CONTRACT)
                envelope=json.loads((bundle/'bundle.json').read_bytes()); envelope['clock']['maxUncertaintyMs']=1
                (bundle/'bundle.json').write_bytes(raw(envelope))
                c.update(clockMaxUncertaintyMs=1,bundleSha256=sha(raw(envelope)),obligation='G6.cancel.observed-drain')
                report,code = observe.check('OBS-CANCEL',encoded,CONTRACT,c,bundle,key)
                self.assertEqual(code==0,passes,report)
                if reason: self.assertIn(reason,report['reasons'][0])
                # [EXP-O05-R4] Why: caller/drain/reuse values must be identical to the disputed control. Rejected: unrelated positive replacement.
                unchanged={k:v for k,v in encoded.items() if k not in ('source','corroboration','engineActiveSamples')}
                self.assertEqual(unchanged,{k:v for k,v in original.items() if k!='engineActiveSamples'})

if __name__=='__main__': unittest.main()
