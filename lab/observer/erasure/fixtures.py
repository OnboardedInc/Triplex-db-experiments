"""Synthetic location files and raw observer frames; never touches engine storage."""
import base64
import copy
import hashlib
import json
from pathlib import Path
import sqlite3
import struct
import subprocess
import time
import uuid

from compile import compile_normalizer
from snapshot import read_file

ROOT = Path(__file__).resolve().parent
PHASES = ('before', 'shred', 'rotate')

# [EXP-ER01-S] Why: explicit R38 4.2 inventory prevents fixture success hiding an omitted location kind.
# Rejected: testing only convenient logs or inventing physical proof for heaps/freed host blocks.
LOCATIONS = {
    'q-broker-sqlite': ('Q', 'broker.db', 'remove', 'sqlite'),
    'q-broker-wal': ('Q', 'broker.db-wal', 'append-only', 'wal'),
    'q-frame-segment': ('Q', 'frames/0001.segment', 'append-only', 'bytes'),
    'q-recent-rows-h1': ('Q', 'h1.db', 'remove', 'sqlite'),
    'q-vocabulary': ('Q', 'triplex.vocabulary', 'append-only', 'vocab'),
    'q-update-triples': ('Q', 'triplex.update-triples', 'append-only', 'bytes'),
    'q-previous-index': ('Q', 'previous.1/triplex.index.spo', 'append-only', 'bytes'),
    'q-index': ('Q', 'triplex.index.spo', 'append-only', 'bytes'),
    'q-generation-new': ('Q', 'gens/g2/triplex.vocabulary', 'remove', 'vocab'),
    'q-generation-old': ('Q', 'gens/g1/triplex.vocabulary', 'append-only', 'vocab'),
    'q-metrics-log': ('Q', 'metrics-log.jsonl', 'append-only', 'bytes'),
    'q-server-log': ('Q', 'server.log', 'append-only', 'bytes'),
    'q-rebuild-log': ('Q', 'rebuild.log', 'append-only', 'bytes'),
    'x-log': ('X', 'log/LOG', 'append-only', 'bytes'),
    'x-replica-log': ('X', 'log/REPLICA_LOG', 'append-only', 'bytes'),
    'x-buffer-l0': ('X', 'buffers/L0.arrow', 'append-only', 'bytes'),
    'x-buffer-ln': ('X', 'buffers/L8.arrow', 'append-only', 'bytes'),
    'x-garbage-trie': ('X', 'buffers/garbage-trie.arrow', 'append-only', 'bytes'),
    'x-source-log-msgs': ('X', 'xt.source_log_msgs.tx_ops.json', 'append-only', 'ei'),
    'x-debug-log': ('X', 'DEBUG.log', 'append-only', 'bytes'),
    'x-spans': ('X', 'spans.jsonl', 'append-only', 'bytes'),
    'x-docker-log': ('X', 'docker-json.log', 'append-only', 'bytes'),
    'd-storage-segment': ('D', 'pgdata/base/storage-heap', 'remove', 'pg'),
    'd-transactor-log': ('D', 'transactor.log', 'append-only', 'bytes'),
    'd-gateway-log': ('D', 'gateway.log', 'append-only', 'bytes'),
    'd-storage-wal': ('D', 'pgdata/pg_wal/storage-wal', 'append-only', 'pg'),
    'backup-data': ('all', 'backups/data.snapshot', 'append-only', 'bytes'),
    'golden-clone': ('all', 'golden-clone/data.snapshot', 'append-only', 'bytes'),
    'backup-db-output': ('D', 'backup-db/output', 'append-only', 'bytes'),
    'observer-store': ('all', 'observer/chunk', 'append-only', 'bytes'),
    'proxy-capture': ('all', 'proxy/transport.bin', 'append-only', 'bytes'),
    'docker-log': ('all', 'docker/container-json.log', 'append-only', 'bytes'),
    'host-log': ('all', 'host/errors.log', 'append-only', 'bytes'),
    'evaluation-closure': ('all', 'closures/outbox/work-items.json', None, 'bytes'),
}
KEY_LOCATIONS = {
    'qx-keys-sqlite': ('keys.db', 'wrapped', 'sqlite-keyset/1', 'key-store'),
    'qx-keys-wal': ('keys.db-wal', 'wrapped', 'bytes', None),
    'd-keys-heap': ('triplex_keys/heap', 'wrapped', 'bytes', None),
    'd-keys-toast': ('triplex_keys/TOAST', 'wrapped', 'bytes', None),
    'd-keys-wal': ('triplex_keys/pg_wal', 'wrapped', 'bytes', None),
    'keys-backup': ('backups/keys.json', 'wrapped', 'keyset-json/1', 'key-backup'),
    'kms-sqlite': ('kms.db', 'epoch', 'bytes', None),
    'kms-wal': ('kms.db-wal', 'epoch', 'bytes', None),
    'kms-records': ('kms/rows.json', 'epoch', 'kms-json/1', 'kms'),
}
UNSCANNABLE = {
    'd-undocumented-segment': 'datomic-segment/unknown',
    'd-undocumented-wal': 'datomic-wal/unknown',
    'jvm-node-heap-lru': 'process-heap/unknown',
    'freed-vm-filesystem-blocks': 'filesystem-free-blocks/unknown',
    'freed-host-apfs-blocks': 'apfs-physical/unknown',
}


def b64(data):
    return base64.b64encode(data).decode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def packed(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def vocabulary(words):
    # Legal FSST-squared fixture encoder: fixed 8-byte symbols, escapes for the tail.
    symbols = sorted({word[i:i + 8] for word in words for i in range(0, len(word) - 7, 8)})
    if len(symbols) > 255:
        raise ValueError('fixture dictionary too large')
    decoder = bytearray(2304)
    for i, symbol in enumerate(symbols):
        decoder[9 + i] = len(symbol)
        decoder[264 + i * 8:264 + i * 8 + len(symbol)] = symbol
    encoded = []
    for word in words:
        out = bytearray()
        for i in range(0, len(word), 8):
            part = word[i:i + 8]
            if part in symbols:
                out.append(symbols.index(part))
            else:
                for byte in part:
                    out.extend((255, byte))
        encoded.append(bytes(out))
    # Second decoder maps each byte to itself, with 255 still escaped.
    second = bytearray(2304)
    for i in range(255):
        second[9 + i] = 1
        second[264 + i * 8] = i
    encoded = [word.replace(b'\xff', b'\xff\xff') for word in encoded]
    data = b''.join(encoded)
    offsets = [0]
    for word in encoded:
        offsets.append(offsets[-1] + len(word))
    offset_data = b''.join(struct.pack('<Q', value) for value in offsets)
    footer = struct.pack('<QQQII', len(offsets), len(offsets), len(offset_data), 7601577, 0)
    return {'codebooks': struct.pack('<Q', 1) + decoder + second,
            'external': data, 'offsets': offset_data + footer,
            'internal': struct.pack('<Q', len(data)) + data + struct.pack('<Q', len(offsets)) + offset_data,
            'ids': struct.pack('<Q', len(words)) + b''.join(struct.pack('<Q', i) for i in range(len(words)))}


def sqlite_files(path, values, key_rows=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    try:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('PRAGMA secure_delete=ON')
        db.execute('PRAGMA wal_autocheckpoint=0')
        if key_rows is None:
            db.execute('CREATE TABLE fixture_control (value BLOB)')
            db.executemany('INSERT INTO fixture_control VALUES (?)', [(value,) for value in values])
        else:
            db.execute('CREATE TABLE er01_keys (key_id TEXT, tenant TEXT, epoch INTEGER, wrapped TEXT)')
            db.executemany('INSERT INTO er01_keys VALUES (?, ?, ?, ?)',
                           [(row['keyId'], row['tenant'], row['epoch'], row['wrapped']) for row in key_rows])
        db.commit()
        db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        # A committed WAL copy as well as the main DB must hold the controls.
        if key_rows is None:
            db.executemany('INSERT INTO fixture_control VALUES (?)', [(value,) for value in values])
        else:
            db.executemany('INSERT INTO er01_keys VALUES (?, ?, ?, ?)',
                           [(row['keyId'], row['tenant'], row['epoch'], row['wrapped']) for row in key_rows])
        db.commit()
        return path.read_bytes(), Path(str(path) + '-wal').read_bytes()
    finally:
        db.close()


def make_fixture(directory, include_unscannable=False):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    material = json.loads(subprocess.check_output(['node', str(ROOT / 'fixture_crypto.mjs')]))
    target_plain = material['targetPlain'].encode()
    twin = material['twinPlain'].encode()
    envelopes = material['envelopes']
    run_id = 'ER01-S-' + uuid.uuid4().hex
    spec = {'format': 'erasure-scanner-case/1', 'boundary': 'declared-files-only',
            'runId': run_id, 'sourceId': 'H6', 'streamId': 'erasure-files',
            'engineContainerId': 'offline-fixture-no-engine', 'slot': 'offline',
            'nativeSourceIdentity': 'fixture-independent-EI',
            'envelopes': envelopes, 'plain': {'target': b64(target_plain), 'twin': b64(twin),
                'provenance': {'commitPath': 'fixture-commit-1', 'valueKind': 'string',
                               'protectedAssertionId': 'erased-assertion', 'twinAssertionId': 'unprotected-twin'}},
            'locations': {}, 'inventory': {}, 'phases': {}, 'keyNeedles': []}
    live_wrapped = base64.b64decode(material['keys'][2]['wrapped'])
    for row in material['keys'][:2]:
        spec['keyNeedles'].append({'kind': 'wrapped', 'epoch': row['epoch'],
                                  'target': row['wrapped'], 'control': b64(live_wrapped)})
    spec['keyNeedles'].append({'kind': 'epoch', 'epoch': 1, 'target': material['epochs'][0]['wrapped'],
                              'control': material['epochs'][1]['wrapped']})
    payloads = {phase: {} for phase in PHASES}

    def add(file_id, location, path, codec, phase_contents, **extra):
        spec['inventory'][file_id] = {'path': '/fixture/' + path, 'location': location,
                                     'sourceKind': 'EI' if location == 'x-source-log-msgs' else 'HO',
                                     'codec': codec, **extra}
        for phase, content in zip(PHASES, phase_contents):
            payloads[phase][file_id] = content

    for location, (lane, path, retention, kind) in LOCATIONS.items():
        spec['locations'][location] = {'lane': lane, 'scans': ['P'] + (['C'] if retention else []),
                                       'retention': retention, 'r38Section': '4.2'}
        parts = []
        for phase in PHASES:
            values = [twin, envelopes[1]['envelope'].encode()]
            if phase == 'before' or retention == 'append-only':
                values.append(envelopes[0]['envelope'].encode())
            if kind == 'vocab':
                parts.append(vocabulary(values))
            elif kind in ('sqlite', 'wal'):
                pair = sqlite_files(directory / 'build' / phase / location / 'data.db', values)
                parts.append(pair[1 if kind == 'wal' else 0])
            elif kind == 'pg':
                # Raw-page fixture, not a fabricated claim to native Datomic/Postgres serialization.
                page = bytearray(16384)
                header = b'ER01-S RAW PG PAGE BYTE FIXTURE\x00'
                page[:len(header)] = header
                data = b'\x00'.join(values)
                page[8180:8180 + len(data)] = data
                parts.append(bytes(page))
            else:
                parts.append(b'\x00'.join(values))
        if kind == 'vocab':
            for part in parts[0]:
                add(location + ':' + part, location, path + '.' + part, 'qlever-fsst-squared-le64/0.6',
                    [item[part] for item in parts], part=part)
        else:
            add(location, location, path, 'bytes', parts)

    key_rows = {p: material['keys'] if p == 'before' else material['keys'][2:] for p in PHASES}
    sqlite_pairs = {phase: sqlite_files(directory / 'build' / phase / 'vault' / 'keys.db', [], key_rows[phase])
                    for phase in PHASES}
    for location, (path, key_kind, codec, role) in KEY_LOCATIONS.items():
        spec['locations'][location] = {'scans': ['K'], 'keyKind': key_kind, 'r38Section': '4.2'}
        parts = []
        for phase in PHASES:
            epochs = material['epochs'] if phase != 'rotate' else material['epochs'][1:]
            if codec == 'sqlite-keyset/1':
                content = sqlite_pairs[phase][0]
            elif location == 'qx-keys-wal':
                content = sqlite_pairs[phase][1]
            elif codec in ('keyset-json/1', 'kms-json/1'):
                content = packed({'format': codec, 'rows': key_rows[phase] if key_kind == 'wrapped' else epochs})
            elif key_kind == 'epoch':
                pair = sqlite_files(directory / 'build' / phase / location / 'kms.db',
                                    [base64.b64decode(row['wrapped']) for row in epochs])
                content = pair[1 if location.endswith('wal') else 0]
            else:
                content = b'PG RAW HEAP/TOAST/WAL FIXTURE\x00' + b'\x00'.join(base64.b64decode(row['wrapped']) for row in key_rows[phase])
            parts.append(content)
        extra = {'decryptRole': role} if role else {}
        if codec == 'sqlite-keyset/1':
            extra['walFileId'] = 'qx-keys-wal'
        add(location, location, path, codec, parts, **extra)
    add('root', 'root', 'outside-data/root.key', 'root-hex/1', [material['root'].encode()] * 3, decryptRole='root')
    if include_unscannable:
        for location, codec in UNSCANNABLE.items():
            spec['locations'][location] = {'scans': ['P', 'C'], 'retention': 'remove'}
            content = b'\x00'.join([target_plain, twin, *(e['envelope'].encode() for e in envelopes)])
            add(location, location, location, codec, [content] * 3)
    spec['caseSha256'] = sha(packed(spec))
    now = time.monotonic_ns() / 1e6
    for index, phase in enumerate(PHASES):
        spec['phases'][phase] = {'start': now + index * 10, 'end': now + index * 10 + 9,
                                 'nonce': uuid.uuid4().hex}
    capture = make_frames(spec, payloads, directory)
    (directory / 'case.json').write_bytes(packed(spec) + b'\n')
    (directory / 'raw.jsonl').write_bytes(capture)
    (directory / 'normalizer.py').write_bytes(compile_normalizer(spec))
    return spec, payloads, capture


def make_frames(spec, payloads, directory=None):
    frames = []
    for phase in PHASES:
        files = []
        for file_id, content in payloads[phase].items():
            item = spec['inventory'][file_id]
            if directory:
                path = Path(directory) / 'sources' / phase / file_id.replace(':', '_')
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
                captured = read_file(str(path.resolve()), len(content))
                if captured['sha256'] != sha(content):
                    raise ValueError('fixture file readback differs from planted bytes')
                content = base64.b64decode(captured['bytes'])
            files.append({'fileId': file_id, **{k: item[k] for k in ('path', 'location', 'sourceKind', 'codec')},
                          'bytes': b64(content), 'size': len(content), 'sha256': sha(content),
                          'stable': True, 'capture': 'complete-file'})
        raw = packed({'phase': phase, 'slot': spec['slot'], 'nonce': spec['phases'][phase]['nonce'], 'files': files,
                      'nativeEnvelopes': spec['envelopes'], 'nativeSourceKind': 'EI',
                      'nativeSourceIdentity': spec['nativeSourceIdentity']})
        frames.append({**{k: spec[k] for k in ('runId', 'sourceId', 'streamId', 'engineContainerId', 'caseSha256', 'slot')},
                       'tStartMono': spec['phases'][phase]['start'], 'tEndMono': spec['phases'][phase]['end'],
                       'rawBase64': b64(raw), 'rawSha256': sha(raw)})
    return b'\n'.join(packed(frame) for frame in frames) + b'\n'
