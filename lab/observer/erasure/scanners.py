"""Evaluator-only P/C/K/D normalizers. No live engine writes or deletion API."""
import base64
import hashlib
import json
import math
import sqlite3
import subprocess
import tempfile
from pathlib import Path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def unbase(value):
    return base64.b64decode(value, validate=True)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


# [EXP-ER01-S] Why: the evaluator pins attempt, inventory and phase windows before parsing.
# Rejected: accepting sample-provided paths, checksums or an old run's positive controls.
def decode_capture(data, spec):
    result = {}
    previous = -1
    for line in data.splitlines():
        frame = json.loads(line)
        for field in ('runId', 'sourceId', 'engineContainerId', 'caseSha256'):
            if frame[field] != spec[field]:
                raise ValueError('frame binding mismatch: ' + field)
        if frame['streamId'] != spec['streamId']:
            raise ValueError('frame stream/slot mismatch')
        start, end = frame['tStartMono'], frame['tEndMono']
        if not all(type(x) in (int, float) and math.isfinite(x) for x in (start, end)):
            raise ValueError('invalid sample clock')
        if not previous <= start <= end:
            raise ValueError('sample order mismatch')
        previous = end
        raw = unbase(frame['rawBase64'])
        if digest(raw) != frame['rawSha256']:
            raise ValueError('raw chunk hash mismatch')
        sample = json.loads(raw)
        if sample['slot'] != spec['slot']:
            raise ValueError('source slot mismatch')
        phase = sample['phase']
        window = spec['phases'][phase]
        if sample['nonce'] != window['nonce'] or not window['start'] <= start <= end <= window['end']:
            raise ValueError('stale or misplaced phase')
        if phase in result:
            raise ValueError('duplicate phase')
        files = {}
        expected = spec['inventory']
        if len(sample['files']) != len(expected):
            raise ValueError('incomplete file inventory')
        for file in sample['files']:
            file_id = file['fileId']
            if file_id in files or file_id not in expected:
                raise ValueError('unexpected or duplicate file')
            item = expected[file_id]
            for field in ('path', 'location', 'sourceKind', 'codec'):
                if file[field] != item[field]:
                    raise ValueError('file identity mismatch: ' + field)
            content = unbase(file['bytes'])
            if type(file['size']) is not int or len(content) != file['size'] or digest(content) != file['sha256']:
                raise ValueError('file content/size mismatch')
            if file['capture'] != 'complete-file' or file['stable'] is not True:
                raise ValueError('partial or changing source')
            files[file_id] = content
        if set(files) != set(expected):
            raise ValueError('missing source files')
        ei = sample['nativeEnvelopes']
        if sample['nativeSourceKind'] != 'EI' or sample['nativeSourceIdentity'] != spec['nativeSourceIdentity']:
            raise ValueError('native read identity mismatch')
        if canonical(ei) != canonical(spec['envelopes']):
            raise ValueError('native envelope/context mismatch')
        result[phase] = files
    if set(result) != {'before', 'shred', 'rotate'} or set(spec['phases']) != set(result):
        raise ValueError('missing erasure phase')
    return result


def contents(files, spec, location, blind=False):
    selected = {key: item for key, item in spec['inventory'].items() if item['location'] == location}
    if not selected:
        raise ValueError('location missing from inventory')
    codecs = {item['codec'] for item in selected.values()}
    if codecs == {'qlever-fsst-squared-le64/0.6'}:
        if blind:
            raise ValueError('FSST decoder intentionally disabled')
        parts = {item['part']: files[key] for key, item in selected.items()}
        if len(parts) != len(selected):
            raise ValueError('duplicate vocabulary component')
        # Search physical companion bytes as well as each decoded word independently.
        return list(files[key] for key in selected) + qlever_vocabulary(parts)
    if codecs - {'bytes', 'keyset-json/1', 'kms-json/1', 'root-hex/1', 'sqlite-keyset/1'}:
        raise ValueError('unsupported/opaque location codec: ' + ','.join(sorted(codecs)))
    return [files[key] for key in selected]


def positive_contents(files, spec, location, blind=False):
    selected = {key: item for key, item in spec['inventory'].items() if item['location'] == location}
    if selected and {item['codec'] for item in selected.values()} == {'qlever-fsst-squared-le64/0.6'}:
        if blind:
            raise ValueError('FSST decoder intentionally disabled')
        return qlever_vocabulary({item['part']: files[key] for key, item in selected.items()})
    return contents(files, spec, location, blind)


def found(blobs, needle):
    if not needle:
        raise ValueError('empty scan control/needle')
    return sum(blob.count(needle) for blob in blobs)


def plaintext_forms(value):
    text = value.decode('utf8')
    return set((value, text.encode('utf-16le'), text.encode('utf-32le'),
                json.dumps(text, ensure_ascii=True)[1:-1].encode(),
                base64.b64encode(value), value.hex().encode()))


def status(failed):
    return 'FAIL' if failed else 'PASS'


# [EXP-ER01-S] Why: byte absence counts only after the same decoder finds the matched twin.
# Rejected: a successful grep exit or positive control in a different location/attempt.
def scan_p(capture, spec, location, blind=False):
    plain = spec['plain']
    target, twin = unbase(plain['target']), unbase(plain['twin'])
    if target == twin or (len(target) + 31) // 32 != (len(twin) + 31) // 32:
        raise ValueError('plaintext twin must differ and share length bucket')
    provenance = plain['provenance']
    if set(provenance) != {'commitPath', 'valueKind', 'protectedAssertionId', 'twinAssertionId'} or not all(provenance.values()):
        raise ValueError('missing twin commit/value-kind witness')
    observations = {}
    for phase in capture:
        blobs = contents(capture[phase], spec, location, blind)
        positive = positive_contents(capture[phase], spec, location, blind)
        count = sum(found(positive, value) for value in plaintext_forms(twin))
        if not count:
            raise ValueError('P twin not found: ' + phase)
        observations[phase] = {'twinHits': count, 'protectedHits': sum(found(blobs, value) for value in plaintext_forms(target))}
    return {'status': status(any(v['protectedHits'] for v in observations.values())), 'observations': observations}


# [EXP-ER01-S] Why: C is anchored to observer EI envelope bytes, and retention is location-specific.
# Rejected: requiring removal from append-only logs or trusting a builder's ciphertext flag.
def scan_c(capture, spec, location, policy, blind=False):
    target, control = (item['envelope'].encode() for item in spec['envelopes'])
    observations = {}
    for phase in capture:
        blobs = contents(capture[phase], spec, location, blind)
        observations[phase] = {'targetHits': found(blobs, target), 'controlHits': found(blobs, control)}
        positive = positive_contents(capture[phase], spec, location, blind)
        if not found(positive, control) or (phase == 'before' and not found(positive, target)):
            raise ValueError('C positive envelope missing: ' + phase)
    if policy not in ('remove', 'append-only'):
        raise ValueError('unknown ciphertext retention policy')
    failed = policy == 'remove' and any(observations[p]['targetHits'] for p in ('shred', 'rotate'))
    return {'status': status(failed), 'retention': policy, 'observations': observations}


# [EXP-ER01-S] Why: all enumerated wrapped-key versions and old epoch bytes are searched physically.
# Rejected: SELECT absence (misses WAL/free pages), or checking just the newest key store.
def scan_k(capture, spec, location, key_kind):
    keys = [item for item in spec['keyNeedles'] if item['kind'] == key_kind]
    if not keys or key_kind not in ('wrapped', 'epoch'):
        raise ValueError('missing key controls')
    observations = {}
    for phase in capture:
        blobs = contents(capture[phase], spec, location)
        observations[phase] = []
        for key in keys:
            target, control = unbase(key['target']), unbase(key['control'])
            if target == control or len(target) != len(control):
                raise ValueError('unmatched key control')
            forms = lambda value: (value, base64.b64encode(value), value.hex().encode())
            hit = sum(found(blobs, value) for value in forms(target))
            positive = sum(found(blobs, value) for value in forms(control))
            if not positive or (phase == 'before' and not hit):
                raise ValueError('K positive key missing: ' + phase)
            observations[phase].append({'epoch': key['epoch'], 'targetHits': hit, 'controlHits': positive})
    checked = ('shred', 'rotate') if key_kind == 'wrapped' else ('rotate',)
    return {'status': status(any(row['targetHits'] for p in checked for row in observations[p])),
            'keyKind': key_kind, 'observations': observations}


def sqlite_rows(database, wal):
    # [EXP-ER01-S] Why: replay WAL on private copies, then read a fixed fixture schema.
    # Rejected: opening the source DB (can write SHM/checkpoint) or omitting WAL-resident keys.
    with tempfile.TemporaryDirectory(prefix='er01-read-') as tmp:
        path = Path(tmp) / 'keys.db'
        path.write_bytes(database)
        if wal is not None:
            Path(str(path) + '-wal').write_bytes(wal)
        connection = sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True)
        try:
            if connection.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
                raise ValueError('SQLite integrity failure')
            rows = connection.execute('SELECT key_id, tenant, epoch, wrapped FROM er01_keys').fetchall()
            return [{'keyId': row[0], 'tenant': row[1], 'epoch': row[2], 'wrapped': row[3]} for row in rows]
        finally:
            connection.close()



def sqlite_key_records(raw):
    """Recover the fixed fixture key-record schema, including obsolete WAL/free-page tuples."""
    def varint(start):
        value = 0
        for i in range(9):
            if start + i >= len(raw):
                raise ValueError('truncated SQLite varint')
            byte = raw[start + i]
            if i == 8:
                return (value << 8) | byte, start + i + 1
            value = (value << 7) | (byte & 127)
            if byte < 128:
                return value, start + i + 1
        raise ValueError('invalid SQLite varint')

    rows = []
    offset = 0
    while True:
        serial_start = raw.find(b'\x4d', offset)
        if serial_start < 1:
            if serial_start == 0:
                offset = 1
                continue
            break
        offset = serial_start + 1
        start = serial_start - 1
        try:
            header_size, position = varint(start)
            if not 5 <= header_size <= 16:
                continue
            types = []
            while position < start + header_size:
                serial, position = varint(position)
                types.append(serial)
            if position != start + header_size or len(types) != 4 or types[0] != 77 or types[3] != 173:
                continue
            if types[1] < 13 or types[1] % 2 != 1 or types[1] > 2047 or types[2] not in (1, 2, 3, 4, 5, 6, 8, 9):
                continue
            lengths = [32, (types[1] - 13) // 2,
                       {1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8, 8: 0, 9: 0}[types[2]], 80]
            values = []
            for length in lengths:
                values.append(raw[position:position + length])
                position += length
            key_id, tenant = values[0].decode('ascii'), values[1].decode('utf8')
            epoch = types[2] - 8 if types[2] in (8, 9) else int.from_bytes(values[2], 'big', signed=True)
            wrapped = values[3].decode('ascii')
            if len(key_id) != 32 or len(bytes.fromhex(key_id)) != 16 or not tenant or epoch < 0 or len(unbase(wrapped)) != 60:
                continue
            rows.append({'keyId': key_id, 'tenant': tenant, 'epoch': epoch, 'wrapped': wrapped})
        except (ValueError, UnicodeError, IndexError):
            continue
    return rows


def recover_physical_keys(files, spec, known_keys, known_epochs):
    # [EXP-ER01-S] Why: SELECT sees only current rows, not recoverable old WAL/freed-page records.
    # Rejected: a D PASS while a physical copy still contains a usable canary wrapper/epoch.
    keys, epochs = [], []
    for file_id, item in spec['inventory'].items():
        config = spec['locations'].get(item['location'], {})
        if 'K' not in config.get('scans', []):
            continue
        contents(files, spec, item['location'])
        raw = files[file_id]
        candidates = known_keys if config['keyKind'] == 'wrapped' else known_epochs
        destination = keys if config['keyKind'] == 'wrapped' else epochs
        for row in candidates:
            value = unbase(row['wrapped'])
            if any(form in raw for form in (value, base64.b64encode(value), value.hex().encode())):
                destination.append(row)
        if item['codec'] == 'sqlite-keyset/1' or file_id in {entry.get('walFileId') for entry in spec['inventory'].values() if entry['codec'] == 'sqlite-keyset/1'}:
            keys.extend(sqlite_key_records(raw))
    return keys, epochs

def decrypt_input(files, spec):
    keys, epochs, roots = [], [], []
    inventory = spec['inventory']
    roles = {'key-store': 0, 'key-backup': 0, 'kms': 0, 'root': 0}
    for file_id, item in inventory.items():
        role = item.get('decryptRole')
        if not role:
            continue
        if role not in roles:
            raise ValueError('unknown decrypt inventory role')
        roles[role] += 1
        raw = files[file_id]
        if role == 'root':
            if item['codec'] != 'root-hex/1':
                raise ValueError('unsupported root codec')
            root = raw.decode().strip()
            if len(bytes.fromhex(root)) != 32:
                raise ValueError('invalid root size')
            roots.append(root)
        elif item['codec'] == 'sqlite-keyset/1' and role in ('key-store', 'key-backup'):
            wal_id = item.get('walFileId')
            if wal_id not in inventory:
                raise ValueError('SQLite key-store WAL not inventoried')
            keys.extend(sqlite_rows(raw, files[wal_id]))
        else:
            schema = 'kms-json/1' if role == 'kms' else 'keyset-json/1'
            if item['codec'] != schema:
                raise ValueError('unsupported key-store decoder')
            value = json.loads(raw)
            if value['format'] != schema or not isinstance(value['rows'], list):
                raise ValueError('invalid key-store format')
            destination = epochs if role == 'kms' else keys
            for row in value['rows']:
                required = {'tenant', 'epoch', 'wrapped'} | ({'keyId'} if role != 'kms' else set())
                if set(row) != required or not isinstance(row['epoch'], int) or not isinstance(row['tenant'], str):
                    raise ValueError('invalid key/epoch row')
                if len(unbase(row['wrapped'])) != 60:
                    raise ValueError('invalid wrapped key size')
                destination.append(row)
    for row in keys + epochs:
        if type(row['epoch']) is not int or not isinstance(row['tenant'], str) or not row['tenant'] or len(unbase(row['wrapped'])) != 60:
            raise ValueError('invalid decoded key row')
        if 'keyId' in row and (len(row['keyId']) != 32 or len(bytes.fromhex(row['keyId'])) != 16):
            raise ValueError('invalid assertion key identity')
    if any(count == 0 for count in roles.values()):
        raise ValueError('D needs every declared key store, backups, kms and root')
    return {'roots': roots, 'epochs': epochs, 'keys': keys, 'envelopes': spec['envelopes']}


# [EXP-ER01-S] Why: before opens both exact values; after must still open the matched live control.
# Rejected: a wrong root, unsupported backup or corrupt canary masquerading as destroyed keys.
def scan_d(capture, spec):
    observations = {}
    if digest(Path(NODE_PATH).read_bytes()) != NODE_SHA256:
        raise ValueError('pinned Node crypto runtime changed')
    known = decrypt_input(capture['before'], spec)
    for phase in capture:
        data = decrypt_input(capture[phase], spec)
        physical_keys, physical_epochs = recover_physical_keys(capture[phase], spec, known['keys'], known['epochs'])
        data['keys'].extend(physical_keys)
        data['epochs'].extend(physical_epochs)
        if phase == 'before':
            target_id = base64.urlsafe_b64decode(spec['envelopes'][0]['envelope'][5:] + '===')[:16].hex()
            live_id = base64.urlsafe_b64decode(spec['envelopes'][1]['envelope'][5:] + '===')[:16].hex()
            tenant = spec['envelopes'][0]['context'][0]
            target_rows = {(row['epoch'], row['wrapped']) for row in data['keys'] if row['keyId'] == target_id and row['tenant'] == tenant}
            expected_rows = {(row['epoch'], row['target']) for row in spec['keyNeedles'] if row['kind'] == 'wrapped'}
            if not target_rows or target_rows != expected_rows:
                raise ValueError('K wrapped-key needles do not cover exact D canary key versions')
            live_rows = {row['wrapped'] for row in data['keys'] if row['keyId'] == live_id}
            epoch_rows = {(row['epoch'], row['wrapped']) for row in data['epochs'] if row['tenant'] == tenant}
            for row in spec['keyNeedles']:
                if row['kind'] == 'wrapped' and row['control'] not in live_rows:
                    raise ValueError('K wrapped-key control not bound to live envelope')
                if row['kind'] == 'epoch' and ((row['epoch'], row['target']) not in epoch_rows or row['control'] not in {value for _, value in epoch_rows}):
                    raise ValueError('K epoch needles do not match D key authority')
        proc = subprocess.run([NODE_PATH, '--input-type=module', '-e', DECRYPT_JS], input=canonical(data),
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
        if proc.returncode:
            raise ValueError('D decryptor refused: ' + proc.stderr.decode()[:180])
        rows = json.loads(proc.stdout)
        for row, expected in zip(rows, spec['envelopes']):
            if row['assertionId'] != expected['context'][3] or any(value != expected['plainSha256'] for value in row['digests']):
                raise ValueError('D authenticated plaintext/context does not match expected bytes')
        if len(rows) != 2 or not rows[1]['opened'] or (phase == 'before' and not rows[0]['opened']):
            raise ValueError('D positive control did not open exact expected plaintext')
        observations[phase] = rows
    return {'status': status(any(observations[p][0]['opened'] for p in ('shred', 'rotate'))),
            'observations': observations, 'profile': 'txe1-fixture-padding-and-key-schema/1'}


def normalize_erasure(data, spec):
    try:
        if spec['format'] != 'erasure-scanner-case/1' or spec['boundary'] != 'declared-files-only':
            raise ValueError('unsupported case/boundary')
        if len(spec['envelopes']) != 2 or spec['envelopes'][0] == spec['envelopes'][1]:
            raise ValueError('target/live envelope pair required')
        for item in spec['envelopes']:
            if len(item['context']) != 5 or not item['envelope'].startswith('txe1.'):
                raise ValueError('invalid native envelope binding')
        plain = spec['plain']
        if digest(unbase(plain['target'])) != spec['envelopes'][0]['plainSha256'] or plain['provenance']['protectedAssertionId'] != spec['envelopes'][0]['context'][3] or plain['provenance']['valueKind'] != spec['envelopes'][0]['context'][4]:
            raise ValueError('P plaintext needle not bound to exact D/EI canary')
        locations = spec['locations']
        if not locations or set(scan for loc in locations.values() for scan in loc['scans']) != {'P', 'C', 'K'}:
            raise ValueError('four-scan case requires P, C and K location policies plus D')
        for loc in locations.values():
            if not loc['scans'] or len(set(loc['scans'])) != len(loc['scans']):
                raise ValueError('invalid/duplicate location scan policy')
        if any(item['sourceKind'] not in ('HO', 'DR', 'EI') for item in spec['inventory'].values()):
            raise ValueError('scanner files require independent HO/DR/EI sources')
        paths = [item['path'] for item in spec['inventory'].values()]
        if len(paths) != len(set(paths)) or any(not path.startswith('/') or any(part in ('', '.', '..') for part in path.split('/')[1:]) for path in paths):
            raise ValueError('duplicate or non-normalized physical location')
        if {item['location'] for item in spec['inventory'].values()} != set(locations) | {'root'}:
            raise ValueError('unscanned or uncollected location')
        if {row['kind'] for row in spec['keyNeedles']} != {'wrapped', 'epoch'}:
            raise ValueError('wrapped and epoch key controls required')
        capture = decode_capture(data, spec)
    except (ValueError, KeyError, TypeError, OverflowError) as error:
        return {'format': 'erasure-scans/1', 'status': 'REFUSED', 'reason': str(error), 'scans': []}
    scans = []
    for location, config in spec['locations'].items():
        for scan in config['scans']:
            try:
                if scan == 'P':
                    result = scan_p(capture, spec, location, spec.get('blindVocabulary', False))
                elif scan == 'C':
                    result = scan_c(capture, spec, location, config['retention'], spec.get('blindVocabulary', False))
                elif scan == 'K':
                    result = scan_k(capture, spec, location, config['keyKind'])
                else:
                    raise ValueError('unknown scan kind')
            except (ValueError, KeyError, TypeError, sqlite3.Error) as error:
                result = {'status': 'REFUSED', 'reason': str(error)}
            scans.append({'scan': scan, 'location': location, **result})
    try:
        result = scan_d(capture, spec)
    except (ValueError, KeyError, TypeError, sqlite3.Error, subprocess.TimeoutExpired, OSError) as error:
        result = {'status': 'REFUSED', 'reason': str(error)}
    scans.append({'scan': 'D', 'location': 'all-declared-key-copies', **result})
    verdicts = [item['status'] for item in scans]
    verdict = 'REFUSED' if not verdicts or 'REFUSED' in verdicts else status('FAIL' in verdicts)
    return {'format': 'erasure-scans/1', 'status': verdict, 'runId': spec['runId'], 'slot': spec['slot'],
            'engineContainerId': spec['engineContainerId'], 'caseSha256': spec['caseSha256'],
            'inputSha256': digest(data), 'boundary': spec['boundary'],
            'runtimePin': {'sha256': NODE_SHA256, 'version': NODE_VERSION}, 'scans': scans}
