#!/usr/bin/env python3
"""CX-VOBS6 round 2: source-pinned offline F1/F2/F3 verification only."""
import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import struct
import subprocess
import sys
import threading
import time
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[3]
TARGET = Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/obs01')
REVIEWED = 'bcbf21c48097163ea83557fc8876168983c60595'
sys.path.insert(0, str(TARGET / 'lab/observer'))
import vm_normalizer as n
import vm_watch as w
from vm_fixture import seed, commit
from test_vm import VmObserver, DOMAIN


def load(file):
    spec = importlib.util.spec_from_file_location('cx_vobs6_original_probe', file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


old = load(ROOT / 'lab/verify/OBS01/probe_round7.py')
assert old.n is n and old.w is w


def save(out, name, data):
    (out / name).write_bytes(n.packed(data) + b'\n')


def frame_events(events, mode):
    events = copy.deepcopy(events)
    case = events[0]['case']
    case['clockMode'] = mode
    raw = []
    for event in events:
        payload = n.packed(event)
        now = time.monotonic_ns() / 1e6
        raw.append(n.packed({'runId': event['runId'], 'sourceId': 'H6', 'engineContainerId': 'e' * 64,
            'caseSha256': n.sha(n.packed(case)), 'tStartMono': now, 'tEndMono': now,
            'runStartedMono': case['startedNs'] / 1e6, 'rawSha256': n.sha(payload),
            'rawBase64': base64.b64encode(payload).decode()}))
    return b'\n'.join(raw) + b'\n'


def parse(out, events, mode):
    raw = frame_events(events, mode)
    (out / (mode + '.raw.jsonl')).write_bytes(raw)
    try:
        result = n.normalize(raw)
        save(out, mode + '.normalized.json', result)
        return {'outcome': 'ACCEPTED', 'clockMode': result['clockMode']}
    except ValueError as exc:
        return {'outcome': 'REFUSED', 'error': str(exc)}


def collect_case(out, mode):
    # [CX-VOBS6-R2] Why: exercise actual polling/tailing plus physical operations.
    # Rejected: replacing observed poll values or relying on builder receipts.
    root = out / mode
    root.mkdir()
    file = root / 'broker.db'
    writer = seed(file)
    initial = file.read_bytes()
    inode = file.stat().st_ino
    control = root / 'control'
    control.mkdir()
    run = 'cx-vobs6-r8-' + uuid.uuid4().hex
    state = {'scope': 'evaluator-offline-fixture', 'sqliteVersion': sqlite3.sqlite_version,
             'pragmas': {'journal_mode': writer.execute('PRAGMA journal_mode').fetchone()[0],
                         'synchronous': writer.execute('PRAGMA synchronous').fetchone()[0]}}
    config = {'runId': run, 'case': {'sources': [{'id': 'broker', 'profile': 'sql01',
               'path': str(file), 'writerState': state}], 'durationSeconds': 5},
              'collector': {}, 'sut': {}, 'streams': [{'streamId': 'vm-publication'}]}
    records, errors, poll_windows, deliveries = [], [], [], []
    seal_called = []
    poll_done = threading.Event()
    queue_ready = threading.Event()
    pending = []
    original_inotify = w.Inotify
    original_readonly = n.readonly
    original_read_text = Path.read_text
    original_os_read = os.read
    new = None

    class Recorder:
        def __init__(self, root, config, key):
            Path(root, 'clock').mkdir(parents=True)
        def append(self, sid, payload, start, real):
            records.append(json.loads(payload))
        def seal(self):
            seal_called.append(True)

    class PollConnection:
        def __init__(self, connection):
            self.connection = connection
        def execute(self, sql, *args):
            if sql == 'BEGIN':
                poll_windows.append({'startNs': time.monotonic_ns()})
            result = self.connection.execute(sql, *args)
            if sql == 'COMMIT':
                poll_windows[-1]['endNs'] = time.monotonic_ns()
                poll_done.set()
            return result
        def __getattr__(self, name):
            return getattr(self.connection, name)

    def readonly(path):
        connection = original_readonly(path)
        if threading.current_thread().name.endswith('(poller)'):
            return PollConnection(connection)
        return connection

    class QueuedInotify:
        # [CX-VOBS6-R2] Why: macOS has no inotify; retain the real byte decoder
        # and run-loop rejection path with explicit offline event delivery.
        # Rejected: claiming Linux event generation was independently measured.
        def __init__(self, paths):
            self.decoder = original_inotify.__new__(original_inotify)
            self.decoder.fd = 987654
            self.decoder.names = {1: str(file.parent)}
        def read(self):
            if not queue_ready.wait(.01):
                return []
            queue_ready.clear()
            raw = b''.join(pending)
            pending.clear()
            with patch.object(w.select, 'select', return_value=([987654], [], [])), \
                 patch.object(os, 'read', side_effect=lambda fd, size: raw if fd == 987654 else original_os_read(fd, size)):
                decoded = original_inotify.read(self.decoder)
            deliveries.extend(decoded)
            return decoded
        def close(self):
            pass

    def proc_read(path, *args, **kwargs):
        if str(path) == '/proc/self/cgroup':
            return '0::/docker-' + 'e' * 64 + '.scope\n'
        return original_read_text(path, *args, **kwargs)

    def collect():
        try:
            w.run(config, root / 'output/bundle', b'x' * 32, control, offline=mode != 'rename-over-fast')
        except Exception as exc:
            errors.append(str(exc))

    def event_bytes(name, mask, cookie):
        data = name.encode() + b'\0'
        data += b'\0' * ((-len(data)) % 4)
        return struct.pack('iIII', 1, mask, cookie, len(data)) + data

    worker = threading.Thread(target=collect)
    try:
        with patch.object(w, 'Bundle', Recorder), patch.object(w, 'clock', lambda *args: DOMAIN), \
             patch.object(w, 'noise', lambda: {'scope': 'offline host'}), patch.object(n, 'readonly', readonly), \
             patch.object(w, 'Inotify', QueuedInotify), patch.object(Path, 'read_text', proc_read):
            worker.start()
            deadline = time.monotonic() + 5
            while not (control / 'ready').exists():
                assert not errors and time.monotonic() < deadline, errors
                time.sleep(.001)
            start_state = copy.deepcopy(state)
            if mode == 'path-replacement':
                for suffix in ('', '-wal', '-shm'):
                    source = Path(str(file) + suffix)
                    if source.exists():
                        source.rename(root / ('old.db' + suffix))
                file.write_bytes(initial)
                new = sqlite3.connect(file)
                new.execute('PRAGMA synchronous=FULL')
                new.execute('PRAGMA wal_autocheckpoint=0')
            else:
                new = writer
            send = time.monotonic_ns()
            if mode in ('sync-off-actual', 'sync-off-after-start'):
                new.execute('PRAGMA synchronous=OFF')
            actual_sync = new.execute('PRAGMA synchronous').fetchone()[0]
            commit(new, 1)
            ack = time.monotonic_ns()
            check = original_readonly(file)
            actual_lsn = check.execute('SELECT lsn FROM marker').fetchone()[0]
            check.close()
            swap = None
            if mode == 'path-replacement':
                time.sleep(.4)
                commit(writer, 1)
            if mode == 'rename-over-fast':
                poll_done.clear()
                assert poll_done.wait(2)
                time.sleep(.001)
                replacement = root / 'replacement.db'
                replacement.write_bytes(initial)
                saved = root / 'saved.db'
                poll_done.clear()
                before = time.monotonic_ns()
                os.replace(file, saved)
                os.replace(replacement, file)
                os.replace(file, replacement)
                os.replace(saved, file)
                after = time.monotonic_ns()
                assert file.stat().st_ino == inode and file.read_bytes() == initial
                swap = {'startNs': before, 'endNs': after, 'durationNs': after - before,
                        'restoredOriginalInode': True}
                pending.extend([event_bytes(file.name, 0x40, 71), event_bytes(file.name, 0x80, 72),
                                event_bytes(file.name, 0x40, 73), event_bytes(file.name, 0x80, 74)])
                # [CX-VOBS6-R2] Why: measure both adjacent poll starts before
                # delivering queued rename events; otherwise refusal stops polls.
                # Rejected: inferring the achieved period from the requested one.
                assert poll_done.wait(2)
                queue_ready.set()
            time.sleep(.06)
            (control / 'stop').write_text('stop')
            worker.join(10)
            assert not worker.is_alive()
        save(root, 'collector-events.json', records)
        save(root, 'timing-and-events.json', {'polls': poll_windows, 'swap': swap, 'decodedInotify': deliveries})
        details = {'name': mode, 'collectorErrors': errors, 'sealTransportCalled': bool(seal_called),
                   'startWriterState': start_state, 'actualWriterSynchronous': actual_sync,
                   'actualFreshReadLsn': actual_lsn, 'sendNs': send, 'ackNs': ack}
        assert actual_lsn == 1
        if mode in ('path-replacement', 'rename-over-fast'):
            assert errors and any('F1' in error for error in errors), errors
            assert not seal_called
            details['outcome'] = 'REFUSED'
            if swap:
                previous = max(p['startNs'] for p in poll_windows if p['startNs'] < swap['startNs'])
                following = [p['startNs'] for p in poll_windows if p['startNs'] > swap['endNs']]
                assert not any(swap['startNs'] <= p['startNs'] <= swap['endNs'] for p in poll_windows)
                assert following, 'need measured following poll to bound swap'
                period = min(following) - previous
                assert swap['durationNs'] < period
                assert any('rename/delete event' in error for error in errors), errors
                details['swap'] = {**swap, 'surroundingMeasuredPollPeriodNs': period}
            return details
        assert not errors
        payload = json.loads(new.execute('SELECT payload FROM frames').fetchone()[0])
        offer = {'event': 'driver-send', 'runId': run, 'source': 'broker', 'stream': payload['s'],
                 'operationId': payload['m'][0]['o'], 'attemptId': payload['m'][0]['a'],
                 'atNs': send, 'domain': DOMAIN}
        records.insert(-1, offer)
        if mode == 'sync-off-actual':
            records[0]['case']['sources'][0]['writerState']['pragmas']['synchronous'] = actual_sync
        details['offline'] = parse(root, records, 'offline-synthetic')
        details['vm'] = parse(root, records, 'vm')
        assert details['vm']['outcome'] == 'REFUSED' and 'F2' in details['vm']['error']
        if mode == 'sync-off-actual':
            assert details['offline']['outcome'] == 'REFUSED' and 'F2' in details['offline']['error']
        else:
            assert details['offline']['outcome'] == 'ACCEPTED'
        details['outcome'] = 'EXPECTED-BOUNDARY'
        return details
    finally:
        (control / 'stop').write_text('stop')
        if worker.ident:
            worker.join(10)
        if new is not None and new is not writer:
            new.close()
        writer.close()


def send_boundary(fixture, events, delta):
    send = next(e for e in events if e['event'] == 'driver-send')
    send['atNs'] = 10_550_000 + delta
    return {'sendNs': send['atNs'], 'U': 10_550_000}


def grouped_future(fixture, events):
    frame = fixture.db.execute('SELECT lsn,epoch,offset,prev_crc,payload FROM frames').fetchone()
    lsn, epoch, offset, prev, raw = frame
    wire = json.loads(raw)
    member = copy.deepcopy(wire['m'][0])
    member.update(o='future-operation', a='future-attempt', p=[1025])
    wire['m'].append(member)
    payload = n.packed(wire)
    crc = n.crc32c(payload, n.crc32c(struct.pack('<IIQIIHH', 0x464c5854, len(payload), lsn, epoch, prev, 1, 0), prev))
    end = offset + len(payload) + 36
    fixture.db.execute('UPDATE frames SET payload=?,crc=?,end=?', (payload, crc, end))
    fixture.db.execute('UPDATE marker SET crc=?,size=?', (crc, end))
    fixture.db.commit()
    wal = Path(str(fixture.sql) + '-wal').read_bytes()
    for event in events:
        if event.get('source') == 'broker' and event['event'] == 'wal':
            event['bytes'] = n.blob(wal)
        if event.get('source') == 'broker' and event['event'] == 'final':
            event['wal'] = n.blob(wal)
    send = copy.deepcopy(next(e for e in events if e['event'] == 'driver-send'))
    send.update(operationId=member['o'], attemptId=member['a'], atNs=10_550_001)
    events.insert(-1, send)
    return {'latestSendNs': send['atNs'], 'U': 10_550_000, 'members': 2}


def main():
    out = Path(sys.argv[1]).resolve()
    assert shutil.disk_usage(ROOT).free > 5 * 1024**3
    out.mkdir(parents=True, exist_ok=False)
    paths = ['lab/observer/vm_normalizer.py', 'lab/observer/vm_watch.py', 'lab/observer/test_vm.py',
             'lab/observer/vm_fixture.py', 'lab/observer/collector.py', 'lab/observer/capture.py',
             'lab/observer/verify_seal.py', 'lab/acceptance/oracle/observe.py',
             'lab/experiments/EXP-OBS01/round8/probe_round8.py', 'lab/observer/VM.md',
             'lab/experiments/EXP-OBS01/REPORT.md']
    pins = {}
    for name in paths:
        raw = (TARGET / name).read_bytes()
        exact = subprocess.check_output(['git', 'show', REVIEWED + ':' + name], cwd=ROOT)
        assert raw == exact, 'target differs from reviewed commit: ' + name
        pins[name] = n.sha(raw)
        copy_to = out / 'source' / name
        copy_to.parent.mkdir(parents=True, exist_ok=True)
        copy_to.write_bytes(raw)
    tool = Path(__file__).read_bytes()
    (out / 'reviewer-probe.py').write_bytes(tool)
    original_probe = (ROOT / 'lab/verify/OBS01/probe_round7.py').read_bytes()
    (out / 'original-reviewer-probe.py').write_bytes(original_probe)
    result = {'format': 'cx-vobs6-round8-review/1', 'reviewedCommit': REVIEWED,
              'sourceSha256': pins, 'reviewerToolSha256': n.sha(tool),
              'originalProbeSha256': n.sha(original_probe), 'checks': [],
              'startedNs': time.monotonic_ns(), 'status': 'INCOMPLETE',
              'scope': 'offline only; VM sync enforcement intentionally unimplemented'}
    try:
        python = subprocess.run(['python3', '-B', str(TARGET / 'lab/observer/test_vm.py')],
            cwd=ROOT, capture_output=True, timeout=120, env={**os.environ, 'VM_TEST_EVIDENCE_DIR': str(out)})
        (out / 'python.stdout').write_bytes(python.stdout)
        (out / 'python.stderr').write_bytes(python.stderr)
        assert python.returncode == 0, python.stderr.decode()
        assert b'Ran 14 tests' in python.stderr
        result['pythonTests'] = 14
        adapted = subprocess.run(['python3', '-B', str(TARGET / 'lab/experiments/EXP-OBS01/round8/probe_round8.py'),
                                  str(out / 'adapted-original-probes')], cwd=ROOT, capture_output=True, timeout=120)
        (out / 'adapted.stdout').write_bytes(adapted.stdout)
        (out / 'adapted.stderr').write_bytes(adapted.stderr)
        assert adapted.returncode == 0, adapted.stderr.decode()
        adapted_result = json.loads((out / 'adapted-original-probes/RESULT.json').read_bytes())
        assert adapted_result['sourceUnchanged'] and len(adapted_result['checks']) == 9
        result['adaptedOriginalProbes'] = adapted_result['checks']
        for mode in ('path-replacement', 'rename-over-fast', 'sync-off-actual', 'sync-off-after-start', 'full-control'):
            result['checks'].append(collect_case(out, mode))
        for name, mutation, expected in (
            ('F3-original', old.impossible_send, 'REFUSED'),
            ('F3-send-equals-U', lambda f, e: send_boundary(f, e, 0), 'ACCEPTED'),
            ('F3-send-U-plus-one', lambda f, e: send_boundary(f, e, 1), 'REFUSED'),
            ('F3-grouped-future', grouped_future, 'REFUSED')):
            check = old.fixture_case(out, name, mutation, expected)
            if expected == 'REFUSED':
                assert 'F20 driver send after publication' in check['error'], check
            result['checks'].append(check)
        result['status'] = 'ACCEPT-OFFLINE'
    finally:
        result['sourceUnchanged'] = all(n.sha((TARGET / name).read_bytes()) == digest for name, digest in pins.items())
        result['finishedNs'] = time.monotonic_ns()
        if not result['sourceUnchanged']:
            result['status'] = 'INCOMPLETE-SOURCE-DRIFT'
        save(out, 'RESULT.json', result)
        (out / 'SHA256SUMS').write_text(''.join(n.sha(p.read_bytes()) + '  ' + str(p.relative_to(out)) + '\n'
            for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS'))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
