#!/usr/bin/env python3
"""Independent offline round 10 boundary fixtures; never invokes a VM or container."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'round10' / 'independent'
sys.path.insert(0, str(ROOT / 'lab/observer'))
import vm_normalizer as n
import test_syncwitness as b
from test_round10 import judged


def retain(name, value):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / (name + '.json')).write_bytes(n.packed(value) + b'\n')


class Independent(unittest.TestCase):
    def test_multiple_acks_keep_both_proven_and_unproven_codes(self):
        t = b.Trace(1)
        t.w(100, 111, 101, 0, 128)
        t.s(110, 300, 111, fsenter=120, fsexit=200)
        rows = [{'end': 128, 'visible': True, 'U': 400, 'acks': [115, 250]}]
        result = judged(t, rows)
        retain('multiple-acks', {'trace': t.render(), 'commits': rows, 'result': result,
            'expectedCodes': ['ACK-BEFORE-DURABLE', 'DURABILITY-UNPROVEN']})
        self.assertEqual(set(result['perCommit'][0]['codes']),
            {'ACK-BEFORE-DURABLE', 'DURABILITY-UNPROVEN'})

    def test_wal_tail_without_timestamp_must_not_be_silently_excluded(self):
        h = b.NormalizerCase()
        h.setUp()
        self.addCleanup(h.doCleanups)
        def missing(c):
            # [CX-VOBS7-R10] Why: coverage needs the tail's time as well as final readbacks. Rejected: dropping untimed tails from the coverage set.
            for e in c['events']:
                if e['event'] == 'wal':
                    e.pop('atNs', None)
        raw = h.build(mode='vm', tweak=missing)
        try:
            result = n.normalize(raw)
        except n.WitnessError as error:
            self.assertEqual(error.code, 'TRACE-INCOMPLETE')
            return
        retain('untimed-tail', {'raw': [json.loads(line) for line in raw.splitlines()],
            'result': result, 'expected': 'TRACE-INCOMPLETE: tail coverage cannot be established without its timestamp'})
        self.fail('normalizer accepts un-timestamped WAL tails in a witnessed VM run')

    def test_file_sync_exactness_and_interval_boundaries(self):
        observations = []
        for kind in ('file', 'fs'):
            for at in (119, 120, 139, 140, 299, 300, 301):
                t = b.Trace(1)
                t.w(100, 111, 101, 0, 128)
                if kind == 'file':
                    t.f(110, 140, 111, 101)
                    low = upper = 140
                else:
                    t.s(110, 300, 111, fsenter=120, fsexit=200)
                    low, upper = 120, 300
                r = judged(t, [{'end': 128, 'visible': True, 'U': at, 'acks': [at]}])['perCommit'][0]
                want = {'ACK-BEFORE-DURABLE', 'VISIBLE-BEFORE-DURABLE'} if at < low else {'DURABILITY-UNPROVEN'} if at < upper else set()
                self.assertEqual(set(r['codes']), want)
                self.assertEqual((r['Dlower'], r['D']), (low, upper))
                observations.append({'kind': kind, 'at': at, 'result': r})
        retain('interval-controls', observations)

    def test_w0_wrong_clock_can_pass_with_small_offset_or_transport_delay(self):
        script = r'''
import { clockVerdict } from './lab/bin/sync-witness.mjs';
const make=(suspendNs,pipeNs,alias)=>Array.from({length:20},(_,i)=>{
 const actual=1_000_000_000+i*20_000_000;
 return {monotonicNs:actual+(alias?suspendNs:0),bootNs:actual+suspendNs,receivedNs:actual+pipeNs};
});
process.stdout.write(JSON.stringify([
 {name:'honest',suspendNs:500_000,pipeNs:100_000,result:clockVerdict(make(500_000,100_000,false))},
 {name:'boot-aliased-small-offset',suspendNs:500_000,pipeNs:100_000,result:clockVerdict(make(500_000,100_000,true))},
 {name:'boot-aliased-zero-offset',suspendNs:0,pipeNs:100_000,result:clockVerdict(make(0,100_000,true))},
 {name:'boot-offset-hidden-by-transport',suspendNs:10_000_000,pipeNs:20_000_000,result:clockVerdict(make(10_000_000,20_000_000,true))}
]));
'''
        child = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
            capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr)
        cases = json.loads(child.stdout)
        retain('clock-discrimination', cases)
        self.assertTrue(cases[0]['result']['pass'])
        self.assertFalse(cases[1]['result']['pass'], 'W0 declares a 500us boot-clock substitution acceptable')


if __name__ == '__main__':
    unittest.main(verbosity=2)
