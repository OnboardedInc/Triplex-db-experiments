"""Contract-derived regressions for complete readback, obligation bars and interval timing."""
import copy
import json
from pathlib import Path
import sys
import unittest
import tempfile
import hashlib

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import observe
from test_observe import fixtures, seal
from bundle_fixtures import fixture, raw, sha

CONTRACT = json.loads((HERE.parent/'obligations.json').read_text())
BASE = {c['protocol'][4:]: c for c in fixtures() if c['id'].endswith('/pass')}

class TimingTests(unittest.TestCase):
    def judge(self, protocol):
        case = copy.deepcopy(BASE[protocol])
        c = dict(thresholdIds=list(CONTRACT['thresholds']), selectedThreshold='NS-P3-LAG-P99-MS',
                 scanInventory=case.get('scanInventory'), variant='log-source')
        j = observe.Judge(CONTRACT, c); j.clock = observe.ClockBounds(1)
        e = case['evidence']
        return j, e

    def test_cancel_drain_and_timeout(self):
        j, e = self.judge('CANCEL')
        e.update(tCancelRequested=10, tCallerSettled=20, tDrained=100, tReuseOk=2100,
                 transportAck={'kind':'cancel-ack','t':12}, engineActiveSamples=[{'t':t,'activeQueryIds':[]} for t in range(0,8001,500)])
        e['reuseResult']['t'] = 2100
        e['tDrained'] = 2010
        with self.assertRaisesRegex(observe.Failed, 'drain deadline'): j.cancel(e)
        e['tDrained'] = 2008
        j.cancel(e)
        e.update(tDrained=100, expectedError='E-TIMEOUT', callerError='E-TIMEOUT', tDeadline=12, tCallerSettled=112)
        e['source']['records']['tDeadline'] = 12
        with self.assertRaisesRegex(observe.Failed, 'timeout grace'): j.cancel(e)
        e['tCallerSettled'] = 110
        j.cancel(e)

    def test_connection_deadline(self):
        j, e = self.judge('CONNECTIONS'); e['tClose'] = 20
        e['engineConnectionSamples'][-1]['t'] = 5020
        with self.assertRaisesRegex(observe.Failed, 'baseline'): j.connections(e)
        e['engineConnectionSamples'][-1]['t'] = 5018
        j.connections(e)

    def test_availability_deadline(self):
        j, e = self.judge('AVAILABILITY'); e['tFailure'] = 20
        for p in e['probes']: p['t'] = 60020
        with self.assertRaisesRegex(observe.Failed, 'availability'): j.availability(e)
        for p in e['probes']: p['t'] = 60018
        j.availability(e)
        e['events'] = [{'kind':'manual-restart','t':19}]
        with self.assertRaisesRegex(observe.Failed, 'manual restart'): j.availability(e)

    def test_preabort_coverage(self):
        j, e = self.judge('PREABORT')
        e['coverage'].update({'from':10,'to':90,'segments':[{'from':0,'to':100}]})
        j.preabort(e)
        e['coverage']['from'] = 0
        with self.assertRaisesRegex(observe.Failed, 'coverage'): j.preabort(e)

    def test_maintenance_lag_and_coverage(self):
        j, e = self.judge('MAINTENANCE')
        e.update(tStart=10,tEnd=990,events=[{'kind':'start','t':10},{'kind':'end','t':990}],
                 lagSamples=[{'t':t,'lagMs':250} for t in (0,500,1000)])
        with self.assertRaisesRegex(observe.Failed, 'threshold'): j.maintenance(e)
        for sample in e['lagSamples']: sample['lagMs'] = 248
        j.maintenance(e)
        e['lagSamples'][-1]['t'] = 990
        with self.assertRaisesRegex(observe.Failed, 'cover'): j.maintenance(e)

    def test_erasure_control_and_scan_order(self):
        j, e = self.judge('ERASURE-SCAN'); e['tErasurePublished'] = 10
        for r in e['scans']:
            r['positiveControl'].update(tWritten=0,tFound=2); r['tScan'] = 20
        e.update(e['scans'][0]); j.erasure_scan(e)
        e['scans'][-1]['positiveControl']['tFound'] = 9
        with self.assertRaises(observe.Refused): j.erasure_scan(e)
        e['scans'][-1]['positiveControl']['tFound'] = 2
        e['scans'][-1]['tScan'] = 12
        with self.assertRaisesRegex(observe.Failed, 'follow erasure'): j.erasure_scan(e)

    def test_watermark_bounds_and_containment(self):
        j, e = self.judge('WATERMARK')
        e.update(tReadStart=10,tRouteStart=18,tRouteEnd=30,tReadEnd=40,waitMs=8)
        e['waitEvents']['start']['t'] = 10; e['waitEvents']['end']['t'] = 18
        j.watermark(e)
        e['tRouteStart'] = 20; e['waitMs'] = 10; e['waitEvents']['end']['t'] = 20
        with self.assertRaisesRegex(observe.Failed, 'wait exceeded'): j.watermark(e)
        e['tRouteStart'] = 18; e['waitMs'] = 8; e['waitEvents']['end']['t'] = 18
        e['tReadEnd'] = 30
        with self.assertRaisesRegex(observe.Failed, 'route latency'): j.watermark(e)

    def test_clock_interval_primitives(self):
        clock = observe.ClockBounds(1)
        self.assertFalse(clock.within(10,2010,2000))
        self.assertTrue(clock.within(10,2008,2000))
        self.assertFalse(clock.lt(10,12)); self.assertTrue(clock.lt(10,13))
        self.assertFalse(clock.le(10,11)); self.assertTrue(clock.le(10,12))
        with self.assertRaises(observe.Failed):
            clock.coverage([{'t':0},{'t':1000},{'t':2000}],10,1990,1000)
        clock.coverage([{'t':0},{'t':500},{'t':1000}],10,990,1000)

class AuthenticatedTimingTests(unittest.TestCase):
    def check(self, protocol, e):
        if protocol == 'ACK-ORDER':
            pull = e['ryowPullRoute']; seal(pull,'source',pull['source']['kind'])
        seal(e,'source',e['source']['kind'])
        case = dict(id='contract/uncertain',protocol='OBS-'+protocol,evidence=e)
        with tempfile.TemporaryDirectory(prefix='obs-r3-clock-') as tmp:
            encoded,c,bundle,key = fixture(case,tmp,CONTRACT)
            envelope = json.loads((bundle/'bundle.json').read_bytes())
            envelope['clock']['maxUncertaintyMs'] = 1
            (bundle/'bundle.json').write_bytes(raw(envelope))
            c.update(clockMaxUncertaintyMs=1,bundleSha256=sha(raw(envelope)))
            return observe.check('OBS-'+protocol,encoded,CONTRACT,c,bundle,key)

    def test_authenticated_cancel_with_complete_margin(self):
        e = copy.deepcopy(BASE['CANCEL']['evidence'])
        e.update(tCancelRequested=10,tCallerSettled=20,tDrained=2008,tReuseOk=2100,
                 transportAck={'kind':'cancel-ack','t':12},engineActiveSamples=[{'t':t,'activeQueryIds':[]} for t in range(0,8001,500)])
        e['reuseResult']['t'] = 2100
        result,code = self.check('CANCEL',e)
        self.assertEqual(code,0,result)
        e['tDrained'] = 2010
        result,code = self.check('CANCEL',e)
        self.assertEqual(code,1,result)
        self.assertIn('drain deadline',result['reasons'][0])

    def test_authenticated_ack_and_pull_order(self):
        e = copy.deepcopy(BASE['ACK-ORDER']['evidence']); e['tSourcePublished'] = 0; e['tAck'] = 10
        p = e['ryowPullRoute']
        p.update(tReadStart=20,tRouteStart=26,tRouteEnd=35,tReadEnd=40,waitMs=6)
        p['waitEvents']['start']['t'] = 20; p['waitEvents']['end']['t'] = 26
        result,code = self.check('ACK-ORDER',e)
        self.assertEqual(code,0,result)
        e['tAck'] = 20
        result,code = self.check('ACK-ORDER',e)
        self.assertEqual(code,1,result)
        self.assertIn('pull not at returned commit',result['reasons'][0])
        e['tAck'] = 10; e['tSourcePublished'] = 9
        result,code = self.check('ACK-ORDER',e)
        self.assertEqual(code,1,result)
        self.assertIn('ACK preceded',result['reasons'][0])

class TransitionTests(unittest.TestCase):
    def witnesses(self):
        payload = dict(operationId='op1',position=2,contents=['approved'])
        commit = dict(payload,type='COMMIT',effects=[{'value':'approved'}])
        paths = {p:dict(effects=[{'value':'approved'}],absences=[{'value':'pending'}]) for p in ('eav','ave','vea')}
        return {
            'QT0-RECEIVED':dict(requestPresent=True,request=copy.deepcopy(payload)),
            'QT1-VALIDATED':dict(accepted=True,request=copy.deepcopy(payload),validation=copy.deepcopy(payload)),
            'QT2-LOGGED':dict(recordType='COMMIT',decision='commit',durable=True,commitRecord=commit),
            'QT3-APPLY-SENT':dict(updateSent=True,updateRequest=copy.deepcopy(payload)),
            'QT4s-SOURCE-PUBLISHED':dict(decisionDurable=True,sourceReadable=True,commitRecord=commit,
                                       sourceReadback=dict(payload,effects=[{'value':'approved'}],absences=[])),
            'QT4r-REPLICA-APPLIED':dict(markerVisible=True,marker=copy.deepcopy(payload)),
            'QT5-VERIFIED':dict(accessPaths=paths),
            'QT6-ACKED':dict(callerOutcome='success',receipt=copy.deepcopy(payload)),
            'XT0-RECEIVED':dict(requestPresent=True,request=copy.deepcopy(payload)),
            'XT1-BEGIN-SENT':dict(beginSent=True,beginRequest=copy.deepcopy(payload)),
            'XT2-ENGINE-COMMITTED':dict(committed=True,operationMarkerPresent=True,transaction=copy.deepcopy(payload),marker=copy.deepcopy(payload)),
            'XT3-ACKED':dict(callerOutcome='success',receipt=copy.deepcopy(payload)),
        }

    def test_every_transition_compares_complete_expected_facts(self):
        for transition, facts in self.witnesses().items():
            with self.subTest(transition=transition):
                expected = dict(operationId='op1',position=2,facts=copy.deepcopy(facts))
                j = observe.Judge(CONTRACT,dict(transitionExpectations={transition:expected}))
                record = dict(operationId='op1',position=2,facts=copy.deepcopy(facts))
                obj = dict(readbackOperationId='op1',readbackPosition=2)
                j.transition_witness(transition,record,obj)
                if transition == 'QT5-VERIFIED': record['facts']['accessPaths']['ave']['effects'] = []
                else:
                    field = next(k for k,v in record['facts'].items() if isinstance(v,dict))
                    record['facts'][field]['contents'] = ['wrong']
                with self.assertRaisesRegex(observe.Failed,'case expectations'):
                    j.transition_witness(transition,record,obj)

    def test_fault_crash_and_readback_order(self):
        case = copy.deepcopy(BASE['FAULT-TRANSITIONS']); e = case['evidence']
        row = e['transitions'][0]; row['t'] = 10; row['durableEvidenceObject']['record']['t'] = 10
        row['durableEvidenceObject']['sha256'] = hashlib.sha256(raw(row['durableEvidenceObject']['record'])).hexdigest()
        row['durableEvidenceObject']['tReadBack'] = 30
        e.update(row); e['tCrash'] = 20
        c = dict(variant='log-source',transitionExpectations={row['transition']:dict(operationId='op1',position=2,
                 facts=copy.deepcopy(row['durableEvidenceObject']['record']['facts']))})
        j = observe.Judge(CONTRACT,c); j.clock = observe.ClockBounds(1)
        j.fault_transitions(e)
        row['durableEvidenceObject']['tReadBack'] = 22
        with self.assertRaisesRegex(observe.Failed,'after crash'): j.fault_transitions(e)

class ObligationTests(unittest.TestCase):
    def test_threshold_resolved_from_contract_obligation(self):
        rows = {o['id']:o for o in CONTRACT['obligations']}
        c = dict(witnessKind='reuse',selectedThreshold='T-REUSE-AVOIDED',thresholdIds=['T-INCR-WORK','T-REUSE-AVOIDED'])
        with self.assertRaises(observe.Refused): observe.work_selection(rows['G8.support.incremental-witness'],c)
        with self.assertRaises(observe.Refused): observe.work_selection(rows['G1.found.unchanged44'],c)
        for obligation,kind,bar in [('G8.support.incremental-witness','incremental','T-INCR-WORK'),
                                    ('G8.reuse.positive-witness','reuse','T-REUSE-AVOIDED')]:
            c = dict(witnessKind=kind,selectedThreshold=bar,thresholdIds=[bar])
            self.assertEqual(observe.work_selection(rows[obligation],c),bar)

if __name__ == '__main__':
    unittest.main()
