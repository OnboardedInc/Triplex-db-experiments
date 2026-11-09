#!/usr/bin/env python3
"""Offline R48 review. Regression tests assert required behavior and fail on 3403e187."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'lab/observer'))
import vm_normalizer as n
import vm_syncwitness as sw
import test_syncwitness as builder
from vm_fixture import seed

OUT = Path(__file__).resolve().parent / 'results'


def retain(name, value):
    OUT.mkdir(exist_ok=True)
    (OUT / (name + '.json')).write_bytes(n.packed(value) + b'\n')


def judged(trace, commits=None, wal_len=128):
    return n.judge_witness(n.parse_witness(trace.render()),
        {'wal': (1, 101), 'main': (1, 102), 'cgroup': 111, 'walLen': wal_len},
        commits or [{'end': wal_len, 'U': 500, 'acks': [500], 'visible': True}])


class Controls(unittest.TestCase):
    def trace(self):
        t = builder.Trace(1)
        t.w(100, 111, 101, 0, 32)
        t.w(120, 111, 101, 32, 96)
        return t

    def test_first_qualifying_exit_with_extra_and_overlapping_syncs(self):
        t = self.trace()
        t.f(110, 130, 111, 101)  # [CX-VOBS7] Why: starts before W=120, so not covering. Rejected: exit-only ordering.
        t.f(121, 160, 111, 101)
        t.f(125, 140, 111, 101)
        t.f(150, 180, 111, 101)
        v = judged(t)
        self.assertEqual(v['perCommit'][0]['D'], 140)
        self.assertEqual(v['problems'], [])

    def test_sibling_foreign_failed_and_nonwaiting_syncs_never_cover(self):
        t = self.trace()
        t.f(130, 140, 111, 103)
        t.f(130, 140, 999, 101)
        t.s(130, 140, 999)
        t.f(130, 140, 111, 101, ret=-5)
        t.s(130, 140, 111, wait=0)
        self.assertEqual(judged(t)['perCommit'][0]['codes'], ['SYNC-MISSING'])

    def test_every_direct_commit_gets_ack_and_visibility_checks(self):
        t = self.trace()
        t.f(130, 140, 111, 101)
        t.w(200, 111, 101, 128, 128)
        t.f(210, 220, 111, 101)
        v = judged(t, [{'end': 128, 'U': 139, 'acks': [139], 'visible': True},
                       {'end': 256, 'U': 219, 'acks': [219], 'visible': True}], 256)
        self.assertTrue(all(set(r['codes']) == {'ACK-BEFORE-DURABLE', 'VISIBLE-BEFORE-DURABLE'} for r in v['perCommit']))

    def test_sequence_gap_and_whole_cpu_loss_fail_in_main_parser(self):
        text = self.trace().render(cpus=1)
        gap = '\n'.join(l for l in text.splitlines() if not l.startswith('SW1|W|0|1|'))
        for broken in (gap, text + '@n[1]: 2\n'):
            with self.assertRaises(n.WitnessError) as caught:
                n.parse_witness(broken)
            self.assertEqual(caught.exception.code, 'TRACE-INCOMPLETE')

    def test_checkpoint_and_mmap_codes(self):
        t = self.trace()
        t.f(130, 140, 111, 101)
        t.w(150, 111, 102, 0, 4096)
        t.t(180, 111, 101, 't')
        t.w(190, 111, 101, 0, 128)
        t.f(200, 210, 111, 101)
        self.assertIn('CHECKPOINT-UNSYNCED', [c for c, _ in judged(t)['problems']])
        t.f(160, 170, 111, 102)
        self.assertEqual(judged(t)['problems'], [])
        t.m(220, 111, 101)
        self.assertIn('UNWITNESSED-WRITE', [c for c, _ in judged(t)['problems']])

    def test_sync_before_write_next_commit_sync_really_covers_previous(self):
        t = self.trace()
        t.f(50, 60, 111, 101)
        t.f(180, 190, 111, 101)
        t.w(200, 111, 101, 128, 128)
        v = judged(t, [{'end': 128, 'U': 150, 'acks': [150], 'visible': True},
                       {'end': 256, 'U': 250, 'acks': [250], 'visible': True}], 256)
        self.assertEqual(v['perCommit'][0]['D'], 190)
        self.assertEqual(set(v['perCommit'][0]['codes']), {'ACK-BEFORE-DURABLE', 'VISIBLE-BEFORE-DURABLE'})
        self.assertEqual(v['perCommit'][1]['codes'], ['SYNC-MISSING'])


class Regressions(unittest.TestCase):
    def fixture(self):
        f = builder.NormalizerCase()
        f.setUp()
        self.addCleanup(f.doCleanups)
        return f

    def test_split_marker_then_frame_must_not_skip_visible_check(self):
        h = self.fixture()
        f = h.f
        frame = f.db.execute('SELECT * FROM frames').fetchone()
        marker = f.db.execute('SELECT * FROM marker').fetchone()
        f.db.close()
        f.sql = f.root / 'split.db'
        f.db = seed(f.sql)
        f.main = f.sql.read_bytes()
        # [CX-VOBS7] Why: a logical publication can span two real SQLite commits. Rejected: assuming marker and frame are atomic without checking.
        f.db.execute('UPDATE marker SET lsn=?,epoch=?,h=?,position=?,crc=?,size=? WHERE id=1', marker[1:])
        f.db.commit()
        f.db.execute('INSERT INTO frames VALUES(?,?,?,?,?,?,?,?,?)', frame)
        f.db.commit()

        def split(c):
            ends = n.wal_commits(c['wal']['broker'])
            self.assertEqual(len(ends), 2)
            for e in c['trace'].events:
                if e['cg'] == 111 and e['k'] == 'W' and e['off'] >= ends[0]:
                    e['ts'] += 300_000
            c['trace'].f(10_700_000, 11_000_000, 111, c['files']['broker']['-wal'][1])
            c['ack']['atNs'] = 11_100_000

        raw = h.build(mode='vm', tweak=split)
        try:
            result = n.normalize(raw)
        except n.WitnessError as error:
            self.assertIn('VISIBLE-BEFORE-DURABLE', (error.code, *error.also))
            return
        broker = result['stores']['broker']
        retain('split-publication', {'raw': [json.loads(l) for l in raw.splitlines()],
            'result': result, 'expected': 'refuse: frame commit D=11000000 > position U=10550000',
            'addedCounts': [{k: len(v) for k, v in t['added'].items()} for t in broker['transactions']]})
        self.fail('accepted split publication: second commit has D=11ms but published position U=10.55ms')

    def test_detach_before_final_readback_must_refuse(self):
        h = self.fixture()
        def early(c):
            # [CX-VOBS7] Why: detach precedes the last observation even though all saved WAL bytes were written earlier. Rejected: treating an END marker alone as full-run coverage.
            c['text'] = c['trace'].render(begin=500_000, end=110_400_000)
            for e in c['events']:
                if e['event'] == 'final':
                    e['atNs'] = 500_000_000
        raw = h.build(mode='vm', tweak=early)
        try:
            result = n.normalize(raw)
        except n.WitnessError as error:
            self.assertEqual(error.code, 'TRACE-INCOMPLETE')
            return
        retain('early-detach', {'raw': [json.loads(l) for l in raw.splitlines()], 'result': result,
            'expected': 'TRACE-INCOMPLETE: detach 110400000 < final readbacks 500000000'})
        self.fail('accepted witness ending before final readbacks')

    def test_w1_compare_must_reject_global_unwitnessed_write(self):
        t = builder.Trace(1)
        t.w(100, 111, 101, 0, 128)
        t.f(110, 120, 111, 101)
        t.m(130, 111, 101)
        v = judged(t)
        codes = sorted({c for c, _ in v['problems']}, key=n.WITNESS_CODES.index)
        result = {'primary': codes[0], 'codes': codes, 'problems': v['problems'], 'perCommit': v['perCommit']}
        mismatch = sw.compare('full', result, 1)
        retain('w1-global-refusal', {'trace': t.render(), 'result': result, 'mismatches': mismatch,
            'expected': 'nonempty mismatches; a FULL run with UNWITNESSED-WRITE must fail W1'})
        self.assertTrue(mismatch, 'W1 compare accepts FULL despite global UNWITNESSED-WRITE')

    def test_w3_must_reject_loss_of_every_event_on_one_cpu(self):
        t = builder.Trace(1)
        t.w(100, 111, 101, 0, 128)
        text = t.render(cpus=1) + '@n[1]: 2\n'
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'trace.txt'
            path.write_text(text)
            try:
                result = sw.stream_check(path)
            except n.WitnessError as error:
                self.assertEqual(error.code, 'TRACE-INCOMPLETE')
                return
        retain('w3-whole-cpu-loss', {'trace': text, 'result': result, 'expected': 'TRACE-INCOMPLETE'})
        self.fail('W3 claims lostEvents=0 with CPU 1 dump count 2 and no CPU 1 records')

    def test_syncfs_syscall_boundary_must_not_change_r48_D(self):
        # [CX-VOBS7] Why: the production S record encodes syscall boundaries, while R48 names the successful filesystem sync. Rejected: claiming an upper bound is the first durable instant.
        t = builder.Trace(1)
        t.w(100, 111, 101, 0, 128)
        t.s(110, 300, 111)
        v = judged(t, [{'end': 128, 'U': 250, 'acks': [250], 'visible': True}])
        retain('syncfs-boundaries', {'trace': t.render(), 'hookTimeline': {
            'writeExit': 100, 'sysEnter': 110, 'ext4SyncEnter': 120, 'ext4SyncExit': 200,
            'ackOtherThread': 250, 'positivePollEnd': 250, 'sysExit': 300}, 'result': v,
            'expectedR48': {'D': 200, 'codes': []}})
        self.assertEqual(v['perCommit'][0]['D'], 200, 'syscall return is not the ext4 sync exit required by R48')


if __name__ == '__main__':
    unittest.main(verbosity=2)
