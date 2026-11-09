#!/usr/bin/env python3
"""CX-VOBS6: offline adversarial checks adapted to assert F1/F2/F3 refusal after fixes."""
import base64
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys
import threading
import time
import uuid

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'lab/observer'))
import vm_normalizer as n
import vm_watch as w
from vm_fixture import seed, commit
from test_vm import VmObserver, DOMAIN


def store(out, name, value):
    (out / name).write_bytes(n.packed(value) + b'\n')


def fixture_case(out, name, mutate, expect):
    fixture = VmObserver()
    fixture.setUp()
    try:
        events = fixture.events()
        details = mutate(fixture, events)
        raw = fixture.frames(events)
        (out / (name + '.raw.jsonl')).write_bytes(raw)
        try:
            normalized = n.normalize(raw)
            outcome = 'ACCEPTED'
            store(out, name + '.normalized.json', normalized)
            error = None
        except Exception as exc:
            outcome = 'REFUSED'
            error = str(exc)
        assert outcome == expect, (name, outcome, error)
        return dict(name=name, outcome=outcome, error=error, details=details)
    finally:
        fixture.tearDown()


def collector_case(out, mode):
    # [CX-VOBS6] Why: test actual collector I/O with a stale RO SQLite handle.
    # Rejected: invented poll samples (would not demonstrate the collector bug).
    root = out / mode
    root.mkdir()
    file = root / 'broker.db'
    old = seed(file)
    initial = file.read_bytes()
    initial_inode = file.stat().st_ino
    control = root / 'control'
    control.mkdir()
    records = []
    failures = []
    run_id = 'cx-vobs6-' + uuid.uuid4().hex
    config = {'runId': run_id, 'case': {'sources': [{'id': 'broker', 'profile': 'sql01', 'path': str(file)}], 'durationSeconds': 10},
              'sut': {}, 'collector': {}, 'streams': [{'streamId': 'vm-publication'}]}
    original = (w.Bundle, w.clock, w.noise)

    class RecordingBundle:
        def __init__(self, root, config, key):
            Path(root, 'clock').mkdir(parents=True)
        def append(self, sid, payload, start, real):
            records.append(json.loads(payload))
        def seal(self):
            pass

    # Only Linux identity/noise and bundle transport adapters are replaced. The
    # SQLite poller, tail(), stable(), prefix checks and final capture run intact.
    w.Bundle = RecordingBundle
    w.clock = lambda *args: DOMAIN
    w.noise = lambda: {'scope': 'offline host; no VM claim'}

    def collect():
        try:
            w.run(config, root / 'output/bundle', b'x' * 32, control, offline=True)
        except Exception as exc:
            failures.append(str(exc))

    worker = threading.Thread(target=collect)
    new = None
    try:
        worker.start()
        deadline = time.monotonic() + 5
        while not (control / 'ready').exists():
            if failures or time.monotonic() > deadline:
                raise RuntimeError(('not ready', failures))
            time.sleep(.002)
        if mode == 'path-replacement':
            # A candidate owns this directory and can rename the three files.
            for suffix in ('', '-wal', '-shm'):
                source = Path(str(file) + suffix)
                if source.exists():
                    source.rename(root / ('old.db' + suffix))
            file.write_bytes(initial)
            new = sqlite3.connect(file)
            new.execute('PRAGMA journal_mode=WAL')
            new.execute('PRAGMA synchronous=FULL')
            new.execute('PRAGMA wal_autocheckpoint=0')
        else:
            new = old
            if mode == 'synchronous-off':
                new.execute('PRAGMA synchronous=OFF')
        writer_sync = new.execute('PRAGMA synchronous').fetchone()[0]
        send = time.monotonic_ns()
        commit(new, 1)
        actual_ack = time.monotonic_ns()
        check = n.readonly(file)
        actual_read = check.execute('SELECT lsn FROM marker').fetchone()[0]
        check.close()
        stale_write_start = None
        if mode == 'path-replacement':
            time.sleep(.400)
            stale_write_start = time.monotonic_ns()
            commit(old, 1)
        sync_start = sync_end = None
        if mode == 'synchronous-off':
            # A later explicit sync marks the first requested durability barrier
            # of this OFF commit; no claim about spontaneous OS flush is made.
            time.sleep(.400)
            sync_start = time.monotonic_ns()
            with Path(str(file) + '-wal').open('rb') as wal_file:
                os.fsync(wal_file.fileno())
            sync_end = time.monotonic_ns()
        time.sleep(.060)
        (control / 'stop').write_text('stop')
        worker.join(10)
        assert not worker.is_alive(), failures
        store(root, 'collector-events.json', records)
        if mode == 'path-replacement':
            assert actual_read == 1 and file.stat().st_ino != initial_inode
            assert failures and any('F1' in error for error in failures), failures
            return {'name':mode,'outcome':'REFUSED','errors':failures,'initialInode':initial_inode,'finalInode':file.stat().st_ino,'actualFirstFreshReadLsn':actual_read}
        assert not failures, failures
        assert actual_read == 1
        store(root, 'collector-events.json', records)
        # Trusted test adapter supplies the actual local send required by Q100s;
        # no observer polls, WAL bytes or final readbacks are changed.
        payload = json.loads(new.execute('SELECT payload FROM frames').fetchone()[0])
        offer = {'event': 'driver-send', 'runId': run_id, 'source': 'broker', 'stream': payload['s'],
                 'operationId': payload['m'][0]['o'], 'attemptId': payload['m'][0]['a'], 'atNs': send, 'domain': DOMAIN}
        records.insert(-1, offer)
        records[0]['case']['clockMode'] = 'offline-synthetic'
        records[0]['case']['sources'][0]['writerState']={'scope':'evaluator-offline-fixture','sqliteVersion':sqlite3.sqlite_version,'pragmas':{'journal_mode':new.execute('PRAGMA journal_mode').fetchone()[0],'synchronous':writer_sync}}
        case_hash = n.sha(n.packed(records[0]['case']))
        raw = b''
        for i, event in enumerate(records):
            data = n.packed(event)
            raw += n.packed({'runId': run_id, 'sourceId': 'H6', 'engineContainerId': 'e' * 64,
                'caseSha256': case_hash, 'tStartMono': i, 'tEndMono': i,
                'rawSha256': n.sha(data), 'rawBase64': base64.b64encode(data).decode()}) + b'\n'
        (root / 'normalizer-input.jsonl').write_bytes(raw)
        # The current candidate decision stamp predates the late L, but Q100s
        # correctly allows it. Its presence must not substitute for inode binding.
        try:normalized = n.normalize(raw)
        except ValueError as error:
            if mode!='synchronous-off':raise
            assert 'F2' in str(error), error
            return {'name':mode,'outcome':'REFUSED','error':str(error),'writerSynchronous':writer_sync,'explicitSyncStartNs':sync_start}
        if mode=='synchronous-off':raise AssertionError('OFF source accepted')
        store(root, 'normalized.json', normalized)
        position = normalized['stores']['broker']['positions'][0]
        polls=[]
        for event in records:
            if event['event']=='poll':polls.append(event)
            elif event['event']=='polls':polls.extend(event['polls'])
        first=next(i for i,poll in enumerate(polls) if poll['visible']>=[0,1])
        assert first>0 and position['U']==polls[first]['endNs'] and position['L']==polls[first-1]['startNs'], position
        details = {'name': mode, 'outcome': 'ACCEPTED', 'actualCommitAckNs': actual_ack,
                   'actualFirstFreshReadLsn': actual_read, 'decoyCommitStartNs': stale_write_start,
                   'observedL': position['L'], 'observedU': position['U'],
                   'lateLowerBoundNs': position['L'] - actual_ack,
                   'writerSynchronous': writer_sync, 'explicitSyncStartNs': sync_start, 'explicitSyncEndNs': sync_end,
                   'initialInode': initial_inode, 'finalInode': file.stat().st_ino,
                   'scope': 'actual collector I/O with offline platform/transport adapters; not a sealed VM bundle'}
        if mode == 'path-replacement':
            assert file.stat().st_ino != initial_inode and details['lateLowerBoundNs'] > 300_000_000, details
        elif mode == 'synchronous-off':
            assert writer_sync == 0 and sync_start - position['U'] > 300_000_000, details
        return details
    finally:
        (control / 'stop').write_text('stop')
        worker.join(10)
        w.Bundle, w.clock, w.noise = original
        if new and new is not old:
            new.close()
        old.close()


def impossible_send(fixture, events):
    fixture.db.execute('UPDATE frames SET committed_at=15')
    fixture.db.commit()
    wal = Path(str(fixture.sql) + '-wal').read_bytes()
    for event in events:
        if event.get('source') == 'broker':
            if event['event'] == 'driver-send':
                event['atNs'] = 15_900_000
            if event['event'] == 'final':
                event['wal'] = n.blob(wal)
            if event['event'] == 'wal':
                event['bytes'] = n.blob(wal)
    return {'sendNs': 15_900_000, 'publicationU': 10_550_000, 'windowUpperNs': 15_550_000,
            'stampInterval': [15_000_000, 16_000_000], 'windowHasNoPoints': True}


def wal_negative(fixture, events, mode):
    event = next(e for e in events if e['event'] == 'wal' and e['source'] == 'broker')
    raw = n.unblob(event['bytes'])
    if mode == 'reset':
        event['offset'] = len(raw)
    else:
        changed = raw[:-1] + bytes([raw[-1] ^ 1])
        event['bytes'] = n.blob(changed)
        if mode == 'checksum':
            next(e for e in events if e['event'] == 'final' and e['source'] == 'broker')['wal'] = n.blob(changed)
    return {'mutation': mode}


def schema_negative(fixture, events):
    fixture.consumer.execute('ALTER TABLE frontier ADD COLUMN unknown TEXT')
    fixture.consumer.commit()
    raw = Path(str(fixture.fd) + '-wal').read_bytes()
    for event in events:
        if event.get('source') == 'consumer' and event['event'] == 'wal':
            event['bytes'] = n.blob(raw)
        if event.get('source') == 'consumer' and event['event'] == 'final':
            event['wal'] = n.blob(raw)
    return {'mutation': 'extra-column'}


def checkpoint_negative(fixture, events):
    # A real rollover changes main and restarts WAL generation; keep captured
    # generation zero in the input, as a collector would before rollover.
    checkpoint = fixture.db.execute('PRAGMA wal_checkpoint(TRUNCATE)').fetchone()
    commit(fixture.db, 2)
    wal = Path(str(fixture.sql) + '-wal').read_bytes()
    final = next(e for e in events if e['event'] == 'final' and e['source'] == 'broker')
    final['main'] = n.blob(fixture.sql.read_bytes())
    final['wal'] = n.blob(wal)
    return {'checkpointResult': list(checkpoint), 'newWalSha256': n.sha(wal)}


def main():
    out = Path(sys.argv[1]).resolve()
    out.mkdir(parents=True, exist_ok=False)
    assert shutil.disk_usage(ROOT).free > 5 * 1024**3
    files = ['lab/observer/vm_normalizer.py', 'lab/observer/vm_watch.py', 'lab/observer/vm_fixture.py',
             'lab/observer/test_vm.py', 'lab/bin/vm-observer.mjs', 'lab/experiments/EXP-OBS01/round8/probe_round8.py']
    pins = {p: n.sha((ROOT / p).read_bytes()) for p in files}
    for file in files:
        target = out / 'source' / file
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / file, target)
    result = {'format': 'CX-VOBS6-offline-review/1', 'runId': uuid.uuid4().hex,
              'sourceSha256': pins, 'startedNs': time.monotonic_ns(), 'checks': []}
    try:
        for mode in ('path-replacement', 'synchronous-off', 'full-control'):
            result['checks'].append(collector_case(out, mode))
        result['checks'].append(fixture_case(out, 'send-after-publication', impossible_send, 'REFUSED'))
        for mode in ('rewrite', 'reset', 'checksum'):
            result['checks'].append(fixture_case(out, 'wal-' + mode,
                lambda fixture, events, mode=mode: wal_negative(fixture, events, mode), 'REFUSED'))
        result['checks'].append(fixture_case(out, 'unknown-schema', schema_negative, 'REFUSED'))
        result['checks'].append(fixture_case(out, 'checkpoint-rollover', checkpoint_negative, 'REFUSED'))
    finally:
        result['sourceUnchanged'] = all(n.sha((ROOT / p).read_bytes()) == digest for p, digest in pins.items())
        result['finishedNs'] = time.monotonic_ns()
        store(out, 'RESULT.json', result)
        (out / 'SHA256SUMS').write_text(''.join(n.sha(p.read_bytes()) + '  ' + str(p.relative_to(out)) + '\n'
            for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS'))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
