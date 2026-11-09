#!/usr/bin/env python3
"""Offline adversarial gates; these are scanner fixtures, not engine-erasure receipts."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import sqlite3
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from compile import compile_normalizer
from fixtures import (KEY_LOCATIONS, LOCATIONS, PHASES, UNSCANNABLE, b64, make_fixture,
                      make_frames, packed, sha, vocabulary)
from fsst import fsst_decode, qlever_vocabulary
from snapshot import read_file

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class Scanners(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
            raise RuntimeError('host free disk below 5 GiB; refusing scanner fixture gate')
        cls.tmp = tempfile.TemporaryDirectory(prefix='er01-scanners-')
        cls.root = Path(cls.tmp.name)
        cls.spec, cls.payloads, cls.capture = make_fixture(cls.root / 'fixture')
        cls.ns = {'__name__': 'frozen_erasure'}
        exec(compile_normalizer(cls.spec), cls.ns)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def normalize(self, spec=None, payloads=None, capture=None):
        spec = self.spec if spec is None else spec
        raw = self.capture if capture is None and payloads is None else capture
        if payloads is not None:
            raw = make_frames(spec, payloads)
        return self.ns['normalize_erasure'](raw, spec)

    def verdict(self, result, scan, location):
        return next(item for item in result['scans'] if item['scan'] == scan and item['location'] == location)

    def test_g_s1_all_reachable_location_fixture_controls(self):
        result = self.normalize()
        self.assertEqual(result['status'], 'PASS', result)
        expected = sum(1 + bool(item[2]) for item in LOCATIONS.values()) + len(KEY_LOCATIONS) + 1
        self.assertEqual(len(result['scans']), expected)
        self.assertEqual({item['location'] for item in result['scans']}, set(LOCATIONS) | set(KEY_LOCATIONS) | {'all-declared-key-copies'})
        for item in result['scans']:
            self.assertEqual(item['status'], 'PASS', item)
            if item['scan'] == 'P':
                self.assertGreater(item['observations']['before']['twinHits'], 0)
            if item['scan'] == 'C':
                self.assertGreater(item['observations']['before']['targetHits'], 0)
            if item['scan'] == 'K':
                self.assertTrue(all(row['targetHits'] > 0 for row in item['observations']['before']))

    def test_each_plaintext_location_detects_planted_secret(self):
        target = base64.b64decode(self.spec['plain']['target'])
        for location, (_, _, _, kind) in LOCATIONS.items():
            with self.subTest(location=location):
                payloads = copy.deepcopy(self.payloads)
                if kind == 'vocab':
                    words = [base64.b64decode(self.spec['plain']['twin']), target,
                             *(e['envelope'].encode() for e in self.spec['envelopes'])]
                    for part, content in vocabulary(words).items():
                        payloads['rotate'][location + ':' + part] = content
                else:
                    payloads['rotate'][location] += b'\x00' + target
                result = self.normalize(payloads=payloads)
                row = self.verdict(result, 'P', location)
                self.assertIn(row['status'], ('FAIL', 'REFUSED'))
                self.assertGreater(row['observations']['rotate']['protectedHits'], 0)

    def test_plaintext_encoding_profiles_find_controls_and_leaks(self):
        target, twin = (base64.b64decode(self.spec['plain'][key]) for key in ('target', 'twin'))
        target_forms = self.ns['plaintext_forms'](target)
        twin_forms = self.ns['plaintext_forms'](twin)
        self.assertGreaterEqual(len(target_forms), 5)
        for positive, protected in zip(sorted(twin_forms), sorted(target_forms)):
            payloads = copy.deepcopy(self.payloads)
            for phase in PHASES:
                payloads[phase]['host-log'] = positive + b'\x00' + protected
            result = self.normalize(payloads=payloads)
            row = self.verdict(result, 'P', 'host-log')
            self.assertEqual(row['status'], 'REFUSED')
            self.assertGreater(row['observations']['rotate']['protectedHits'], 0)

    def test_each_removing_cipher_location_detects_retained_envelope(self):
        target = self.spec['envelopes'][0]['envelope'].encode()
        for location, (_, _, policy, kind) in LOCATIONS.items():
            if policy != 'remove':
                continue
            with self.subTest(location=location):
                payloads = copy.deepcopy(self.payloads)
                if kind == 'vocab':
                    for part in vocabulary([b'x']):
                        payloads['rotate'][location + ':' + part] = payloads['before'][location + ':' + part]
                else:
                    payloads['rotate'][location] += target
                result = self.normalize(payloads=payloads)
                row = self.verdict(result, 'C', location)
                self.assertIn(row['status'], ('FAIL', 'REFUSED'))
                self.assertGreater(row['observations']['rotate']['targetHits'], 0)

    def test_each_key_location_detects_residual_key(self):
        for location in KEY_LOCATIONS:
            with self.subTest(location=location):
                payloads = copy.deepcopy(self.payloads)
                payloads['rotate'][location] = payloads['before'][location]
                result = self.normalize(payloads=payloads)
                row = self.verdict(result, 'K', location)
                self.assertIn(row['status'], ('FAIL', 'REFUSED'))
                self.assertTrue(any(v['targetHits'] for v in row['observations']['rotate']))

    def test_no_positive_control_is_refused_per_location(self):
        for location in LOCATIONS:
            with self.subTest(location=location):
                payloads = copy.deepcopy(self.payloads)
                for key, item in self.spec['inventory'].items():
                    if item['location'] == location:
                        payloads['before'][key] = b''
                result = self.normalize(payloads=payloads)
                self.assertEqual(self.verdict(result, 'P', location)['status'], 'REFUSED')

    def test_g_s2_blind_vocabulary_refuses_with_and_without_target(self):
        spec = copy.deepcopy(self.spec)
        spec['blindVocabulary'] = True
        for phase in ('before', 'rotate'):
            payloads = copy.deepcopy(self.payloads)
            for part in vocabulary([b'x']):
                payloads[phase]['q-vocabulary:' + part] = self.payloads['before']['q-vocabulary:' + part]
            result = self.normalize(spec=spec, payloads=payloads)
            self.assertEqual(result['status'], 'REFUSED')
            for scan in ('P', 'C'):
                self.assertEqual(self.verdict(result, scan, 'q-vocabulary')['status'], 'REFUSED')

    def test_vocabulary_twin_only_in_codebook_does_not_qualify(self):
        payloads = copy.deepcopy(self.payloads)
        twin = base64.b64decode(self.spec['plain']['twin'])
        fixture = vocabulary([b'no-twin-word', *(item['envelope'].encode() for item in self.spec['envelopes'])])
        books = bytearray(fixture['codebooks'])
        offset = 8 + 2304 + 264 + 200 * 8
        books[offset:offset + len(twin)] = twin
        fixture['codebooks'] = bytes(books)
        for phase in PHASES:
            for part, data in fixture.items():
                payloads[phase]['q-vocabulary:' + part] = data
        result = self.normalize(payloads=payloads)
        self.assertEqual(self.verdict(result, 'P', 'q-vocabulary')['status'], 'REFUSED')

    def test_p_key_and_inventory_bindings_cannot_be_omitted(self):
        for mutation in ('plain', 'assertion', 'kind', 'locations', 'version', 'duplicate-path'):
            with self.subTest(mutation=mutation):
                spec = copy.deepcopy(self.spec)
                if mutation == 'plain':
                    spec['plain']['target'] = b64(b'another-secret-same-size-001')
                elif mutation in ('assertion', 'kind'):
                    spec['plain']['provenance']['protectedAssertionId' if mutation == 'assertion' else 'valueKind'] = 'wrong'
                elif mutation == 'locations':
                    spec['locations'] = {}
                elif mutation == 'version':
                    spec['keyNeedles'].pop(0)
                else:
                    spec['inventory']['host-log']['path'] = spec['inventory']['proxy-capture']['path']
                result = self.normalize(spec=spec, payloads=self.payloads)
                self.assertEqual(result['status'], 'REFUSED')

    def test_changed_crypto_runtime_is_refused(self):
        old = self.ns['NODE_SHA256']
        self.ns['NODE_SHA256'] = '00' * 32
        try:
            result = self.normalize()
            self.assertEqual(self.verdict(result, 'D', 'all-declared-key-copies')['status'], 'REFUSED')
        finally:
            self.ns['NODE_SHA256'] = old

    def test_fsst_known_real_index_literal_and_manifest(self):
        root = REPO / 'provenance/archive/qlever-bootstrap'
        manifest = json.loads((root / 'MANIFEST.json').read_bytes())
        for item in manifest['files']:
            data = (root / item['path']).read_bytes()
            self.assertEqual(len(data), item['bytes'])
            self.assertEqual(sha(data), item['sha256'])
        suffixes = {'codebooks': '.codebooks', 'internal': '.words.internal', 'ids': '.words.internal.ids',
                    'external': '.words.external', 'offsets': '.words.external.offsets'}
        files = {key: (root / ('triplex.vocabulary' + suffix)).read_bytes() for key, suffix in suffixes.items()}
        words = qlever_vocabulary(files)
        self.assertEqual((root / 'bootstrap.nt').read_text(), '<urn:triplex:bootstrap> <urn:triplex:format> "1" .\n')
        for literal in (b'"1"', b'<urn:triplex:bootstrap>', b'<urn:triplex:format>'):
            self.assertIn(literal, words)
        self.assertNotIn(b'"1"', files['external'])
        self.assertNotIn(b'"1"', files['internal'])

    def test_fsst_escapes_unicode_long_external_and_corruptions(self):
        words = [b'', b'a', bytes(range(256)), 'literal-\u2603-\u00e9'.encode(), b'longliteral' * 1000]
        fixture = vocabulary(words)
        self.assertEqual(qlever_vocabulary(fixture), words + words)
        for part in fixture:
            damaged = dict(fixture)
            damaged[part] = fixture[part][:-1]
            with self.subTest(part=part), self.assertRaises((ValueError, IndexError)):
                qlever_vocabulary(damaged)
        decoder = fixture['codebooks'][8:2312]
        with self.assertRaisesRegex(ValueError, 'truncated FSST escape'):
            fsst_decode(b'\xff', decoder)

    def test_unknown_native_encodings_and_unreachable_locations_refuse(self):
        spec, payloads = copy.deepcopy(self.spec), copy.deepcopy(self.payloads)
        for location, codec in UNSCANNABLE.items():
            spec['locations'][location] = {'scans': ['P', 'C'], 'retention': 'remove'}
            item = copy.deepcopy(spec['inventory']['host-log'])
            item.update(location=location, path='/fixture/' + location, codec=codec)
            spec['inventory'][location] = item
            for phase in PHASES:
                payloads[phase][location] = self.payloads[phase]['host-log']
        result = self.normalize(spec=spec, payloads=payloads)
        self.assertEqual(result['status'], 'REFUSED')
        for location in UNSCANNABLE:
            self.assertEqual(self.verdict(result, 'P', location)['status'], 'REFUSED')
            self.assertEqual(self.verdict(result, 'C', location)['status'], 'REFUSED')

    def test_g_s3_live_control_opens_erased_key_and_epoch_removed(self):
        result = self.verdict(self.normalize(), 'D', 'all-declared-key-copies')
        self.assertEqual(result['status'], 'PASS')
        self.assertTrue(all(row['opened'] for row in result['observations']['before']))
        for phase in ('shred', 'rotate'):
            self.assertFalse(result['observations'][phase][0]['opened'])
            self.assertTrue(result['observations'][phase][1]['opened'])

    def test_d_backup_undoes_shred_and_blocks_pass(self):
        payloads = copy.deepcopy(self.payloads)
        payloads['shred']['keys-backup'] = payloads['before']['keys-backup']
        result = self.verdict(self.normalize(payloads=payloads), 'D', 'all-declared-key-copies')
        self.assertEqual(result['status'], 'FAIL')
        self.assertTrue(result['observations']['shred'][0]['opened'])

    def test_d_stale_backup_and_stale_kms_undo_rotation(self):
        payloads = copy.deepcopy(self.payloads)
        payloads['rotate']['keys-backup'] = payloads['before']['keys-backup']
        payloads['rotate']['kms-records'] = payloads['before']['kms-records']
        result = self.verdict(self.normalize(payloads=payloads), 'D', 'all-declared-key-copies')
        self.assertEqual(result['status'], 'FAIL')
        self.assertTrue(result['observations']['rotate'][0]['opened'])

    def test_d_stale_wrapped_key_without_destroyed_epoch_cannot_open(self):
        payloads = copy.deepcopy(self.payloads)
        old = json.loads(payloads['before']['keys-backup'])
        old['rows'] = [old['rows'][0], old['rows'][2]]
        payloads['rotate']['keys-backup'] = packed(old)
        result = self.verdict(self.normalize(payloads=payloads), 'D', 'all-declared-key-copies')
        self.assertEqual(result['status'], 'PASS', result)
        self.assertFalse(result['observations']['rotate'][0]['opened'])
        # K still rejects this backup: R38 forbids key-store backups under the old epoch.
        self.assertEqual(self.verdict(self.normalize(payloads=payloads), 'K', 'keys-backup')['status'], 'FAIL')

    def test_d_deleted_sqlite_row_survives_in_old_wal_frames(self):
        payloads = copy.deepcopy(self.payloads)
        rows = json.loads(payloads['before']['keys-backup'])['rows']
        path = self.root / 'retained-history.db'
        db = sqlite3.connect(path)
        try:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('PRAGMA wal_autocheckpoint=0')
            db.execute('CREATE TABLE er01_keys (key_id TEXT, tenant TEXT, epoch INTEGER, wrapped TEXT)')
            insert = lambda values: db.executemany('INSERT INTO er01_keys VALUES (?, ?, ?, ?)',
                [(row['keyId'], row['tenant'], row['epoch'], row['wrapped']) for row in values])
            insert(rows[2:])
            db.commit()
            db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
            insert(rows[:2])
            db.commit()
            db.execute('DELETE FROM er01_keys WHERE key_id = ?', (rows[0]['keyId'],))
            db.commit()
            self.assertEqual(db.execute('SELECT COUNT(*) FROM er01_keys WHERE key_id = ?', (rows[0]['keyId'],)).fetchone(), (0,))
            payloads['shred']['qx-keys-sqlite'] = path.read_bytes()
            payloads['shred']['qx-keys-wal'] = Path(str(path) + '-wal').read_bytes()
            recovered = self.ns['sqlite_key_records'](payloads['shred']['qx-keys-wal'])
            for row in rows[:2]:
                self.assertIn(row, recovered)
        finally:
            db.close()
        result = self.verdict(self.normalize(payloads=payloads), 'D', 'all-declared-key-copies')
        self.assertIn(result['status'], ('FAIL', 'REFUSED'))
        self.assertTrue(result['observations']['shred'][0]['opened'])

    def test_d_recovers_key_and_epoch_from_physical_pg_and_kms_wal(self):
        payloads = copy.deepcopy(self.payloads)
        payloads['rotate']['d-keys-wal'] = payloads['before']['d-keys-wal']
        payloads['rotate']['kms-wal'] = payloads['before']['kms-wal']
        result = self.verdict(self.normalize(payloads=payloads), 'D', 'all-declared-key-copies')
        self.assertIn(result['status'], ('FAIL', 'REFUSED'))
        self.assertTrue(result['observations']['rotate'][0]['opened'])

    def test_fresh_wrapped_key_in_utf16_historical_wal_fails_with_complete_coverage(self):
        material = {'root': self.payloads['before']['root'].decode(),
                    'key': json.loads(self.payloads['before']['keys-backup'])['rows'][1],
                    'epoch': json.loads(self.payloads['before']['kms-records'])['rows'][1],
                    'envelope': self.spec['envelopes'][0]}
        proof = json.loads(subprocess.check_output(['node', str(HERE / 'qa_round1/rewrap.mjs')], input=packed(material)))
        self.assertEqual(proof['independentlyOpenedSha256'], self.spec['envelopes'][0]['plainSha256'])
        control = json.loads(self.payloads['before']['keys-backup'])['rows'][2]
        for encoding in ('UTF-16le', 'UTF-16be'):
            with self.subTest(encoding=encoding):
                path = self.root / (encoding + '-fresh-wrapper.db')
                db = sqlite3.connect(path)
                try:
                    db.execute("PRAGMA encoding='" + encoding + "'")
                    db.execute('PRAGMA journal_mode=WAL'); db.execute('PRAGMA secure_delete=ON')
                    db.execute('PRAGMA wal_autocheckpoint=0')
                    db.execute('CREATE TABLE er01_keys (key_id TEXT, tenant TEXT, epoch INTEGER, wrapped TEXT)')
                    db.execute('INSERT INTO er01_keys VALUES(?,?,?,?)', tuple(control[k] for k in ('keyId','tenant','epoch','wrapped')))
                    db.commit(); db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                    row = proof['row']
                    db.execute('INSERT INTO er01_keys VALUES(?,?,?,?)', tuple(row[k] for k in ('keyId','tenant','epoch','wrapped')))
                    db.commit()
                    db.execute('DELETE FROM er01_keys WHERE key_id=?', (row['keyId'],)); db.commit()
                    changed = copy.deepcopy(self.payloads)
                    changed['rotate']['qx-keys-sqlite'] = path.read_bytes()
                    changed['rotate']['qx-keys-wal'] = Path(str(path)+'-wal').read_bytes()
                finally: db.close()
                result = self.normalize(payloads=changed)
                d = self.verdict(result,'D','all-declared-key-copies')
                self.assertTrue(d['observations']['rotate'][0]['opened'])
                self.assertEqual(d['status'],'FAIL',d)
                k = self.verdict(result,'K','qx-keys-wal')
                self.assertEqual(k['status'],'FAIL',k)
                self.assertTrue(any(row.get('newVersions') for row in k['observations']['rotate']))

    def test_escaping_layers_feed_plaintext_key_and_decrypt_searches(self):
        from fixtures import fixture_record_file
        from formats import fixture_records
        material = {'root': self.payloads['before']['root'].decode(),
                    'key': json.loads(self.payloads['before']['keys-backup'])['rows'][1],
                    'epoch': json.loads(self.payloads['before']['kms-records'])['rows'][1],
                    'envelope': self.spec['envelopes'][0]}
        proof = json.loads(subprocess.check_output(['node', str(HERE / 'qa_round1/rewrap.mjs')], input=packed(material)))
        self.assertEqual(proof['independentlyOpenedSha256'], self.spec['envelopes'][0]['plainSha256'])
        encoders = {
            'json-unicode': lambda value: b'INFO event={"value":"' + b''.join(('\\u%04x'%b).encode() for b in value) + b'"}',
            'url': lambda value: b''.join(('%%%02X'%b).encode() for b in value),
            'backslash': lambda value: b''.join(('\\x%02x'%b).encode() for b in value),
            'quoted-printable': lambda value: b''.join(('=%02X'%b).encode() for b in value),
        }
        encoders['nested'] = lambda value: encoders['url'](encoders['quoted-printable'](encoders['json-unicode'](value)))
        for layer, encode in encoders.items():
            with self.subTest(layer=layer):
                changed = copy.deepcopy(self.payloads)
                for file, value in (('host-log', self.spec['plain']['target'].encode()),
                                    ('d-keys-heap', packed(proof['row']))):
                    blobs, _, _ = fixture_records(changed['rotate'][file])
                    changed['rotate'][file] = fixture_record_file(blobs + [encode(value)])
                result = self.normalize(payloads=changed)
                p = self.verdict(result, 'P', 'host-log')
                self.assertEqual(p['status'], 'FAIL', p)
                self.assertGreater(p['observations']['rotate']['protectedHits'], 0)
                k = self.verdict(result, 'K', 'd-keys-heap')
                self.assertEqual(k['status'], 'FAIL', k)
                d = self.verdict(result, 'D', 'all-declared-key-copies')
                self.assertEqual(d['status'], 'FAIL', d)
                self.assertTrue(d['observations']['rotate'][0]['opened'])

    def test_d_wrong_root_incomplete_backup_and_unsupported_store_refuse(self):
        for mutation in ('root', 'backup', 'format', 'row'):
            with self.subTest(mutation=mutation):
                spec, payloads = copy.deepcopy(self.spec), copy.deepcopy(self.payloads)
                if mutation == 'root':
                    payloads['rotate']['root'] = b'00' * 32
                elif mutation == 'backup':
                    del spec['inventory']['keys-backup']['decryptRole']
                elif mutation == 'row':
                    value = json.loads(payloads['before']['keys-backup'])
                    value['rows'][0]['wrapped'] = 'not-base64'
                    payloads['before']['keys-backup'] = packed(value)
                else:
                    spec['inventory']['keys-backup']['codec'] = 'postgres-unknown/1'
                result = self.normalize(spec=spec, payloads=payloads)
                self.assertEqual(self.verdict(result, 'D', 'all-declared-key-copies')['status'], 'REFUSED')

    def test_d_aad_plaintext_and_envelope_corruption_refuse(self):
        for mutation in ('tenant', 'entity', 'attribute', 'assertion', 'type', 'digest', 'ciphertext'):
            with self.subTest(mutation=mutation):
                spec = copy.deepcopy(self.spec)
                if mutation == 'digest':
                    spec['envelopes'][0]['plainSha256'] = '00' * 32
                elif mutation == 'ciphertext':
                    value = spec['envelopes'][0]['envelope']
                    spec['envelopes'][0]['envelope'] = value[:-3] + ('A' if value[-3] != 'A' else 'B') + value[-2:]
                else:
                    i = ('tenant', 'entity', 'attribute', 'assertion', 'type').index(mutation)
                    spec['envelopes'][0]['context'][i] += '-wrong'
                result = self.normalize(spec=spec, payloads=self.payloads)
                self.assertEqual(result['status'], 'REFUSED')
                if result['scans']:
                    self.assertEqual(self.verdict(result, 'D', 'all-declared-key-copies')['status'], 'REFUSED')

    def test_frame_content_freshness_binding_negatives_refuse(self):
        for field in ('runId', 'streamId', 'sourceId', 'engineContainerId', 'caseSha256'):
            with self.subTest(field=field):
                frames = [json.loads(line) for line in self.capture.splitlines()]
                frames[0][field] = 'another-attempt'
                self.assertEqual(self.normalize(capture=b'\n'.join(packed(f) for f in frames))['status'], 'REFUSED')
        for mutation in ('hash', 'time', 'nan', 'nonce', 'slot', 'path', 'size', 'missing', 'duplicate', 'partial', 'changing', 'ei'):
            with self.subTest(mutation=mutation):
                frames = [json.loads(line) for line in self.capture.splitlines()]
                sample = json.loads(base64.b64decode(frames[0]['rawBase64']))
                if mutation == 'hash':
                    frames[0]['rawSha256'] = '00' * 32
                elif mutation == 'time':
                    frames[0]['tStartMono'] = self.spec['phases']['before']['start'] - 100
                elif mutation == 'nan':
                    frames[0]['tStartMono'] = float('nan')
                elif mutation in ('nonce', 'slot'):
                    sample[mutation] = 'old-or-other'
                elif mutation == 'ei':
                    sample['nativeSourceIdentity'] = 'builder-client'
                elif mutation == 'path':
                    sample['files'][0]['path'] = '/other/source'
                elif mutation == 'size':
                    sample['files'][0]['size'] += 1
                elif mutation == 'missing':
                    sample['files'].pop()
                elif mutation == 'duplicate':
                    sample['files'][0] = sample['files'][1]
                elif mutation == 'partial':
                    sample['files'][0]['capture'] = 'tail'
                elif mutation == 'changing':
                    sample['files'][0]['stable'] = False
                if mutation not in ('hash', 'time', 'nan'):
                    raw = packed(sample)
                    frames[0].update(rawBase64=b64(raw), rawSha256=sha(raw))
                self.assertEqual(self.normalize(capture=b'\n'.join(packed(f) for f in frames))['status'], 'REFUSED')
        frames = self.capture.splitlines()
        for raw in (b'\n'.join(frames[1:]), b'\n'.join(frames + frames[:1]), b'\n'.join(reversed(frames))):
            self.assertEqual(self.normalize(capture=raw)['status'], 'REFUSED')

    def test_read_only_capture_unchanged_and_refuses_symlink_or_partial(self):
        path = (self.root / 'read-only.bin').resolve()
        path.write_bytes(b'planted-control' * 1000)
        before = path.stat()
        result = read_file(str(path), 100000)
        self.assertEqual(result['sha256'], sha(path.read_bytes()))
        self.assertEqual(before.st_mtime_ns, path.stat().st_mtime_ns)
        with self.assertRaisesRegex(ValueError, 'budget'):
            read_file(str(path), 10)
        symlink = self.root / 'symlink.bin'
        symlink.symlink_to(path)
        with self.assertRaises(OSError):
            read_file(str(symlink.resolve().parent / symlink.name), 100000)
        directory_link = self.root / 'directory-link'
        directory_link.symlink_to(path.parent, target_is_directory=True)
        with self.assertRaises(OSError):
            read_file(str(directory_link / path.name), 100000)

    def test_frozen_normalizer_replays_without_adjacent_imports(self):
        parser = self.root / 'standalone.py'
        parser.write_bytes(compile_normalizer(self.spec))
        result = subprocess.run(['python3', '-I', '-B', str(parser)], input=self.capture, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), self.normalize())

    def test_obs_bundle_seal_recomputation(self):
        code = self.root / 'frozen-code'
        code.mkdir()
        for name in ('collector.py', 'capture.py'):
            shutil.copyfile(HERE.parent / name, code / name)
        collector = module('er01_collector', code / 'collector.py')
        verifier = module('er01_verify', HERE.parent / 'verify_seal.py')
        spec = copy.deepcopy(self.spec)
        for i, phase in enumerate(PHASES):
            spec['phases'][phase].update(start=1 + 10 * i, end=9 + 10 * i)
        case = {'erasureFixture': sha(packed(spec))}
        spec['caseSha256'] = sha(packed(case))
        parser = compile_normalizer(spec)
        (code / 'normalizer.py').write_bytes(parser)
        stream = {'streamId': spec['streamId'], 'sourceId': spec['sourceId'], 'kind': 'HO/any/H6',
                  'endpoint': 'offline-fixture', 'method': 'scan', 'cadenceMs': 100,
                  'normalizerFile': 'normalizer.py', 'normalizer': {'id': 'er01-four-scans', 'version': '1', 'sha256': sha(parser)}}
        config = {'runId': spec['runId'], 'receiptId': 'fixture', 'keyId': 'fixture', 'case': case,
                  'streams': [stream], 'maxUncertaintyMs': 1,
                  'collector': {'containerId': 'offline', 'sourceSha256': sha(parser), 'imageDigest': 'sha256:fixture',
                                'cgroupPath': 'offline-fixture', 'cpuset': 'fixture'},
                  'sut': {'engineContainerId': spec['engineContainerId'], 'slot': spec['slot'], 'lane': 'xtdb',
                          'engineImageDigest': 'sha256:fixture', 'engineConfigSha256': 'fixture',
                          'enginePids': [{'role': 'fixture', 'pid': 1, 'starttime': 1}]}}
        key = bytes(range(32))
        root = self.root / 'signed-bundle'
        frames = [json.loads(line) for line in make_frames(spec, self.payloads).splitlines()]
        with patch.object(collector, 'mono', side_effect=[0, 3, 13, 23]):
            bundle = collector.Bundle(root, config, key)
            for frame in frames:
                bundle.append(spec['streamId'], base64.b64decode(frame['rawBase64']), frame['tStartMono'], 0)
            bundle.seal()
        key_file = self.root / 'external.key'
        key_file.write_bytes(key)
        config_file = self.root / 'config.json'
        config_file.write_bytes(packed(config))
        receipt = verifier.verify(root, key_file, config_file, code)
        self.assertEqual(receipt['runId'], spec['runId'])
        result = json.loads((root / 'normalized/sources/erasure-files.json').read_bytes())
        self.assertEqual(result['status'], 'PASS', result)
        oracle_file = self.root / 'pinned-observe.py'
        oracle_file.write_bytes(subprocess.check_output(['git', 'show', '23e2273:lab/acceptance/oracle/observe.py'], cwd=REPO))
        oracle = module('er01_pinned_observe', oracle_file)
        bridge = packed({'send': 0, 'receive': 1, 'observerMono': 0}) + b'\n'
        (root / 'clock/bridge.jsonl').write_bytes(bridge)
        entries = bundle.entries[spec['streamId']]
        context = {'format': 'obs-context/1', 'runId': spec['runId'], 'receiptId': 'fixture', 'keyId': 'fixture',
                   'protocol': 'OBS-ERASURE-SCAN', 'obligation': 'offline-fixture', 'case': 'fixture',
                   'witnessKind': 'ERASURE-SCAN', 'thresholdIds': [], 'contractSha256': 'offline-not-semantic',
                   'bundleSha256': sha((root / 'bundle.json').read_bytes()), 'bridgeSha256': sha(bridge),
                   'engine': 'xtdb', 'bindings': {}, 'clockMaxUncertaintyMs': 1,
                   'streams': [{**stream, 'normalizerPath': str(code / 'normalizer.py'), 'chunks': entries}],
                   'witnessHeads': [{'runId': spec['runId'], 'streamId': spec['streamId'], 'seq': len(entries) - 1,
                                     'headSha256': entries[-1]['headerSha256'], 'tMono': 24}]}
        authenticated, uncertainty = oracle.authenticate(root, context, key_file)
        self.assertEqual(uncertainty, 1)
        self.assertEqual(authenticated[spec['streamId']][1], result)
        output = root / 'normalized/sources/erasure-files.json'
        output.write_bytes(b'{"status":"PASS"}\n')
        with self.assertRaisesRegex(ValueError, 'recomputation mismatch'):
            verifier.verify(root, key_file, config_file, code)


if __name__ == '__main__':
    unittest.main(verbosity=2)
