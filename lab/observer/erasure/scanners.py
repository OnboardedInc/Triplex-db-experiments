"""Evaluator-only P/C/K/D normalizers. No live engine writes or deletion API."""
import base64
import hashlib
import json
import math
import re
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
    selected = [key for key, item in spec['inventory'].items() if item['location'] == location]
    if not selected:
        raise ValueError('location missing from inventory')
    analysis = spec.get('_analysis_current') or analyze_files(files, {**spec, 'blindVocabulary': blind})
    return [blob for key in selected for blob in analysis[key]['blobs']]


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
    forms = {value, base64.b64encode(value), base64.urlsafe_b64encode(value),
             base64.b64encode(value).rstrip(b'='), base64.urlsafe_b64encode(value).rstrip(b'='),
             value.hex().encode(), value.hex().upper().encode()}
    for text in list(forms):
        try:
            decoded = text.decode('utf8')
        except UnicodeError:
            continue
        forms.update((decoded.encode('utf-16le'), decoded.encode('utf-16be'), decoded.encode('utf-32le'),
                      json.dumps(decoded, ensure_ascii=True)[1:-1].encode()))
    # SQLite serial integers and record lengths are decoded by formats.py; this also
    # searches byte-array varints without assuming that a length prefix hides content.
    def varint(number):
        out = bytearray()
        while number >= 128:
            out.append((number & 127) | 128); number >>= 7
        out.append(number)
        return bytes(out)
    forms.update((value.decode('latin1').encode('utf8'), value.decode('latin1').encode('utf-16le'), value.decode('latin1').encode('utf-16be')))
    forms.add(b''.join(varint(byte) for byte in value))
    return forms


def status(failed):
    return 'FAIL' if failed else 'PASS'


def qualified_status(candidate, spec, location=None):
    # [EXP-ER01-S-R2] Why: no scanner helper can emit PASS on partial protected coverage.
    # Rejected: relying solely on an aggregate guard that a future caller might omit.
    relevant = {key for key, item in spec['inventory'].items()
                if item['location'] == location or (location is None and
                ('K' in spec['locations'].get(item['location'], {}).get('scans', []) or item.get('decryptRole')))}
    if not relevant or set(spec['_analysis']) != {'before', 'shred', 'rotate'}:
        return 'REFUSED'
    if any(analysis[key]['coverage']['unparsedBytes'] for analysis in spec['_analysis'].values() for key in relevant):
        return 'REFUSED'
    return candidate


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
    observations, issues = {}, []
    for phase in capture:
        spec['_analysis_current'] = spec['_analysis'][phase]
        blobs = contents(capture[phase], spec, location, blind)
        observations[phase] = {'twinHits': sum(found(blobs, value) for value in plaintext_forms(twin)),
                               'protectedHits': sum(found(blobs, value) for value in plaintext_forms(target))}
        try:
            positive = positive_contents(capture[phase], spec, location, blind)
            if not sum(found(positive, value) for value in plaintext_forms(twin)):
                issues.append('P twin not found: ' + phase)
        except ValueError as error: issues.append(str(error))
    return {'status': qualified_status('REFUSED' if issues else status(any(v['protectedHits'] for v in observations.values())), spec, location),
            'issues': issues, 'observations': observations}


# [EXP-ER01-S] Why: C is anchored to observer EI envelope bytes, and retention is location-specific.
# Rejected: requiring removal from append-only logs or trusting a builder's ciphertext flag.
def scan_c(capture, spec, location, policy, blind=False):
    target, control = (item['envelope'].encode() for item in spec['envelopes'])
    observations, issues = {}, []
    for phase in capture:
        spec['_analysis_current'] = spec['_analysis'][phase]
        blobs = contents(capture[phase], spec, location, blind)
        observations[phase] = {'targetHits': sum(found(blobs, value) for value in plaintext_forms(target)),
                               'controlHits': sum(found(blobs, value) for value in plaintext_forms(control))}
        try:
            positive = positive_contents(capture[phase], spec, location, blind)
            if not sum(found(positive, value) for value in plaintext_forms(control)) or (phase == 'before' and not sum(found(positive, value) for value in plaintext_forms(target))):
                issues.append('C positive envelope missing: ' + phase)
        except ValueError as error: issues.append(str(error))
    if policy not in ('remove', 'append-only'): raise ValueError('unknown ciphertext retention policy')
    failed = policy == 'remove' and any(observations[p]['targetHits'] for p in ('shred', 'rotate'))
    return {'status': qualified_status('REFUSED' if issues else status(failed), spec, location), 'retention': policy, 'issues': issues, 'observations': observations}


# [EXP-ER01-S] Why: all enumerated wrapped-key versions and old epoch bytes are searched physically.
# Rejected: SELECT absence (misses WAL/free pages), or checking just the newest key store.
def scan_k(capture, spec, location, key_kind):
    keys = [item for item in spec['keyNeedles'] if item['kind'] == key_kind]
    if not keys or key_kind not in ('wrapped', 'epoch'):
        raise ValueError('missing key controls')
    observations, issues = {}, []
    for phase in capture:
        spec['_analysis_current'] = spec['_analysis'][phase]
        blobs = contents(capture[phase], spec, location)
        observations[phase] = []
        for key in keys:
            target, control = unbase(key['target']), unbase(key['control'])
            if target == control or len(target) != len(control):
                raise ValueError('unmatched key control')
            forms = plaintext_forms
            hit = sum(found(blobs, value) for value in forms(target))
            positive = sum(found(blobs, value) for value in forms(control))
            if not positive or (phase == 'before' and not hit):
                issues.append('K positive key missing: ' + phase)
            observations[phase].append({'epoch': key['epoch'], 'targetHits': hit, 'controlHits': positive})
    target_id = base64.urlsafe_b64decode(spec['envelopes'][0]['envelope'][5:] + '===')[:16].hex()
    for phase in capture:
        recovered = []
        for file_id, item in spec['inventory'].items():
            if item['location'] == location:
                recovered.extend(recovered_rows(spec['_analysis'][phase][file_id]['rows']))
        for row in recovered:
            applies = row.get('keyId') == target_id if key_kind == 'wrapped' else 'keyId' not in row and row['epoch'] in {key['epoch'] for key in keys}
            if applies and row['tenant'] == spec['envelopes'][0]['context'][0] and row['wrapped'] not in {key['target'] for key in keys}:
                chosen = next((entry for entry in observations[phase] if entry['epoch'] == row['epoch']), observations[phase][0])
                chosen['targetHits'] += 1
                chosen.setdefault('newVersions', []).append({'epoch': row['epoch'], 'wrappedSha256': digest(unbase(row['wrapped']))})
    checked = ('shred', 'rotate') if key_kind == 'wrapped' else ('rotate',)
    return {'status': qualified_status('REFUSED' if issues else status(any(row['targetHits'] for p in checked for row in observations[p])), spec, location), 'issues': issues,
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


def decoded_key_box(value):
    if isinstance(value, bytes):
        if len(value) == 60: return base64.b64encode(value).decode()
        for codec in ('utf8', 'utf-16le', 'utf-16be', 'utf-32le', 'utf-32be'):
            try:
                result = decoded_key_box(value.decode(codec))
                if result: return result
            except UnicodeError: pass
        return None
    if not isinstance(value, str): return None
    try:
        binary = value.encode('latin1')
        if len(binary) == 60: return base64.b64encode(binary).decode()
    except UnicodeError: pass
    try:
        raw = base64.b64decode(value + '=' * (-len(value) % 4), altchars=b'-_', validate=True)
        if len(raw) == 60: return base64.b64encode(raw).decode()
    except ValueError: pass
    try:
        raw = bytes.fromhex(value)
        if len(raw) == 60: return base64.b64encode(raw).decode()
    except ValueError: pass
    return None


def recovered_rows(values):
    found_rows = []
    def visit(value, depth=0):
        if depth > 12: return
        if isinstance(value, dict):
            if {'tenant', 'epoch', 'wrapped'} <= set(value):
                wrapped = decoded_key_box(value['wrapped'])
                if wrapped and type(value['epoch']) is int and isinstance(value['tenant'], str):
                    row = {k: value[k] for k in ('tenant', 'epoch')}; row['wrapped'] = wrapped
                    if isinstance(value.get('keyId'), str) and len(value['keyId']) == 32:
                        try:
                            if len(bytes.fromhex(value['keyId'])) == 16: row['keyId'] = value['keyId']
                        except ValueError: pass
                    found_rows.append(row)
            for child in value.values(): visit(child, depth + 1)
        elif isinstance(value, list):
            if len(value) == 4 and isinstance(value[0], str) and isinstance(value[1], str) and type(value[2]) is int:
                visit(dict(zip(('keyId', 'tenant', 'epoch', 'wrapped'), value)), depth + 1)
            if len(value) == 3 and isinstance(value[0], str) and type(value[1]) is int:
                visit(dict(zip(('tenant', 'epoch', 'wrapped'), value)), depth + 1)
            for child in value: visit(child, depth + 1)
    for value in values: visit(value)
    return found_rows



def candidate_boxes(blobs):
    boxes = set()
    for blob in blobs:
        box = decoded_key_box(blob)
        if box: boxes.add(box)
        texts = [blob.decode('utf8', errors='ignore')]
        for codec in ('utf-16le', 'utf-16be', 'utf-32le', 'utf-32be'):
            texts.extend(blob[shift:].decode(codec, errors='ignore') for shift in range(4 if '32' in codec else 2))
        for text in texts:
            for match in re.finditer(r'(?=([0-9a-fA-F]{120}|[A-Za-z0-9_+/\-]{80}))', text):
                box = decoded_key_box(match.group(1))
                if box: boxes.add(box)
                if len(boxes) > 20000: raise ValueError('candidate key enumeration budget exceeded')
    return boxes

def recover_physical_keys(files, spec, known_keys, known_epochs):
    # [EXP-ER01-S-R2] Why: arbitrary fresh wrappers in historical/UTF-16 records must be tried.
    # Rejected: enumerating only byte strings known before erasure (QA F2).
    keys, epochs, boxes = [], [], set()
    analysis = spec['_analysis_current']
    for file_id, item in spec['inventory'].items():
        config = spec['locations'].get(item['location'], {})
        if 'K' not in config.get('scans', []): continue
        views = analysis[file_id]
        for row in recovered_rows(views['rows']):
            (keys if 'keyId' in row else epochs).append(row)
        boxes.update(candidate_boxes(views['blobs']))
        candidates = known_keys if config['keyKind'] == 'wrapped' else known_epochs
        for row in candidates:
            if any(form in blob for form in plaintext_forms(unbase(row['wrapped'])) for blob in views['blobs']):
                (keys if config['keyKind'] == 'wrapped' else epochs).append(row)
    trials = []
    for box in boxes:
        for envelope in spec['envelopes']:
            key_id = base64.urlsafe_b64decode(envelope['envelope'][5:] + '===')[:16].hex()
            for epoch in known_epochs + epochs:
                if epoch['tenant'] == envelope['context'][0]:
                    trials.append({'keyId': key_id, 'tenant': epoch['tenant'], 'epoch': epoch['epoch'], 'wrapped': box})
    epoch_trials = []
    for box in boxes:
        for epoch in known_epochs + epochs:
            epoch_trials.append({'tenant': epoch['tenant'], 'epoch': epoch['epoch'], 'wrapped': box, 'candidateOnly': True})
    return keys, epochs, trials, epoch_trials


def decrypt_input(files, spec):
    keys, epochs, roots, issues = [], [], [], []
    inventory = spec['inventory']
    roles = {'key-store': 0, 'key-backup': 0, 'kms': 0, 'root': 0}
    for file_id, item in inventory.items():
        role = item.get('decryptRole')
        if not role: continue
        if role not in roles:
            issues.append(file_id + ': unknown decrypt role'); continue
        roles[role] += 1
        try:
            raw = files[file_id]
            if role == 'root':
                root = raw.decode().strip()
                if item['codec'] != 'root-hex/1' or len(bytes.fromhex(root)) != 32: raise ValueError('invalid root encoding/size')
                roots.append(root)
            elif item['codec'] == 'sqlite-keyset/1':
                if item.get('walFileId') not in inventory: raise ValueError('SQLite WAL missing')
                keys.extend(sqlite_rows(raw, files[item['walFileId']]))
            else:
                schema = 'kms-json/1' if role == 'kms' else 'keyset-json/1'
                obj = json.loads(raw)
                if item['codec'] != schema or obj['format'] != schema: raise ValueError('unknown key schema')
                (epochs if role == 'kms' else keys).extend(obj['rows'])
        except (ValueError, KeyError, TypeError, sqlite3.Error) as error:
            issues.append(file_id + ': ' + str(error))
    clean_keys, clean_epochs = [], []
    for destination, values in ((clean_keys, keys), (clean_epochs, epochs)):
        for row in values:
            try:
                box = decoded_key_box(row['wrapped'])
                if not box or type(row['epoch']) is not int or not isinstance(row['tenant'], str): raise ValueError('invalid key row')
                value = {'tenant': row['tenant'], 'epoch': row['epoch'], 'wrapped': box}
                if destination is clean_keys:
                    if len(row['keyId']) != 32 or len(bytes.fromhex(row['keyId'])) != 16: raise ValueError('invalid key id')
                    value['keyId'] = row['keyId']
                destination.append(value)
            except (ValueError, KeyError, TypeError) as error: issues.append(str(error))
    if any(count == 0 for count in roles.values()): issues.append('D needs every key store, backup, kms and root')
    return {'roots': roots, 'epochs': clean_epochs, 'keys': clean_keys, 'envelopes': spec['envelopes'], 'issues': issues}


# [EXP-ER01-S] Why: before opens both exact values; after must still open the matched live control.
# Rejected: a wrong root, unsupported backup or corrupt canary masquerading as destroyed keys.
def scan_d(capture, spec):
    observations, issues = {}, []
    if digest(Path(NODE_PATH).read_bytes()) != NODE_SHA256:
        raise ValueError('pinned Node crypto runtime changed')
    known = decrypt_input(capture['before'], spec)
    for phase in capture:
        data = decrypt_input(capture[phase], spec)
        issues.extend(data.pop('issues'))
        spec['_analysis_current'] = spec['_analysis'][phase]
        physical_keys, physical_epochs, trials, epoch_trials = recover_physical_keys(capture[phase], spec, known['keys'], known['epochs'])
        data['keys'].extend(physical_keys)
        data['epochs'].extend(physical_epochs)
        if phase == 'before':
            target_id = base64.urlsafe_b64decode(spec['envelopes'][0]['envelope'][5:] + '===')[:16].hex()
            live_id = base64.urlsafe_b64decode(spec['envelopes'][1]['envelope'][5:] + '===')[:16].hex()
            tenant = spec['envelopes'][0]['context'][0]
            target_rows = {(row['epoch'], row['wrapped']) for row in data['keys'] if row['keyId'] == target_id and row['tenant'] == tenant}
            expected_rows = {(row['epoch'], row['target']) for row in spec['keyNeedles'] if row['kind'] == 'wrapped'}
            if not target_rows or target_rows != expected_rows:
                issues.append('K wrapped-key needles do not cover exact D canary key versions')
            live_rows = {row['wrapped'] for row in data['keys'] if row['keyId'] == live_id}
            epoch_rows = {(row['epoch'], row['wrapped']) for row in data['epochs'] if row['tenant'] == tenant}
            for row in spec['keyNeedles']:
                if row['kind'] == 'wrapped' and row['control'] not in live_rows:
                    issues.append('K wrapped-key control not bound to live envelope')
                if row['kind'] == 'epoch' and ((row['epoch'], row['target']) not in epoch_rows or row['control'] not in {value for _, value in epoch_rows}):
                    issues.append('K epoch needles do not match D key authority')
        data['keys'].extend(trials)
        data['epochs'].extend(epoch_trials)
        data['keys'] = list({canonical(row): row for row in data['keys']}.values())
        data['epochs'] = list({canonical(row): row for row in data['epochs']}.values())
        if set(data['roots']) != set(known['roots']): issues.append('root inventory changed from evaluator before inputs')
        data['roots'] = sorted(set(data['roots'] + known['roots']))
        proc = subprocess.run([NODE_PATH, '--input-type=module', '-e', DECRYPT_JS], input=canonical(data),
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
        if proc.returncode:
            issues.append('D decryptor refused: ' + proc.stderr.decode()[:180])
            observations[phase] = []; continue
        response = json.loads(proc.stdout)
        rows = response['envelopes']; issues.extend(response['issues'])
        for row, expected in zip(rows, spec['envelopes']):
            if row['assertionId'] != expected['context'][3] or any(value != expected['plainSha256'] for value in row['digests']):
                issues.append('D authenticated plaintext/context does not match expected bytes')
        if len(rows) != 2 or not rows[1]['opened'] or (phase == 'before' and not rows[0]['opened']):
            issues.append('D positive control did not open exact expected plaintext')
        observations[phase] = rows
    return {'status': qualified_status('REFUSED' if issues else status(any(observations[p] and observations[p][0]['opened'] for p in ('shred', 'rotate'))), spec),
            'issues': sorted(set(issues)), 'observations': observations, 'profile': 'txe1-fixture-padding-and-key-schema/1'}


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
        spec = dict(spec)
        spec['_analysis'] = {phase: analyze_files(files, {**spec, '_phase': phase}) for phase, files in capture.items()}
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
            coverage = {phase: {key: value['coverage'] for key, value in analysis.items() if spec['inventory'][key]['location'] == location} for phase, analysis in spec['_analysis'].items()}
            incomplete = any(v['unparsedBytes'] for phase in coverage.values() for v in phase.values())
            if incomplete:
                observed = result.get('observations', {})
                violation = (scan == 'P' and any(row.get('protectedHits', 0) for row in observed.values())) or (scan == 'C' and config.get('retention') == 'remove' and any(observed.get(p, {}).get('targetHits', 0) for p in ('shred', 'rotate'))) or (scan == 'K' and any(row.get('targetHits', 0) for p in (('shred', 'rotate') if config.get('keyKind') == 'wrapped' else ('rotate',)) for row in observed.get(p, [])))
                result['findingStatus'] = 'FAIL' if violation else 'UNDETERMINED'
                result.update(status='REFUSED', reason='unparsed protected byte ranges; see coverage')
            result['coverage'] = coverage
            scans.append({'scan': scan, 'location': location, **result})
    try:
        result = scan_d(capture, spec)
    except (ValueError, KeyError, TypeError, sqlite3.Error, subprocess.TimeoutExpired, OSError) as error:
        result = {'status': 'REFUSED', 'reason': str(error)}
    coverage = {phase: {key: value['coverage'] for key, value in analysis.items() if 'K' in spec['locations'].get(spec['inventory'][key]['location'], {}).get('scans', []) or spec['inventory'][key].get('decryptRole')} for phase, analysis in spec['_analysis'].items()}
    if any(v['unparsedBytes'] for phase in coverage.values() for v in phase.values()):
        result['findingStatus'] = 'FAIL' if any(result.get('observations', {}).get(p) and result['observations'][p][0].get('opened') for p in ('shred', 'rotate')) else 'UNDETERMINED'
        result.update(status='REFUSED', reason='D candidate enumeration incomplete in unparsed ranges; see coverage')
    result['coverage'] = coverage
    scans.append({'scan': 'D', 'location': 'all-declared-key-copies', **result})
    verdicts = [item['status'] for item in scans]
    verdict = 'REFUSED' if not verdicts or 'REFUSED' in verdicts else status('FAIL' in verdicts)
    return {'format': 'erasure-scans/1', 'status': verdict, 'runId': spec['runId'], 'slot': spec['slot'],
            'engineContainerId': spec['engineContainerId'], 'caseSha256': spec['caseSha256'],
            'inputSha256': digest(data), 'boundary': spec['boundary'],
            'runtimePin': {'sha256': NODE_SHA256, 'version': NODE_VERSION}, 'scans': scans}
