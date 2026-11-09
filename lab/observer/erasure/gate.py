#!/usr/bin/env python3
"""Retain new offline fixture evidence and explicit adversarial decoder replays."""
import argparse
import base64
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

from compile import compile_normalizer
from fixtures import KEY_LOCATIONS, LOCATIONS, UNSCANNABLE, make_fixture, make_frames, packed, sha

ROOT = Path(__file__).resolve().parent


def replay(root, name, spec, payloads):
    directory = root / name
    directory.mkdir()
    raw, parser = make_frames(spec, payloads), compile_normalizer(spec)
    (directory / 'case.json').write_bytes(packed(spec) + b'\n')
    (directory / 'raw.jsonl').write_bytes(raw)
    (directory / 'normalizer.py').write_bytes(parser)
    result = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
                            input=raw, capture_output=True, check=True, timeout=30)
    record = json.loads(result.stdout)
    (directory / 'records.json').write_bytes(result.stdout)
    return record


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--output', required=True)
    options = args.parse_args()
    if shutil.disk_usage(ROOT).free < 5 * 1024 ** 3:
        raise RuntimeError('host free disk below 5 GiB; refusing new gate')
    output = Path(options.output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    code = output / 'code'
    code.mkdir()
    source_hashes = {}
    for path in sorted(ROOT.iterdir()):
        if path.is_file() and path.suffix in ('.py', '.mjs', '.md'):
            shutil.copyfile(path, code / path.name)
            source_hashes[path.name] = sha(path.read_bytes())
    tests = subprocess.run([sys.executable, '-B', str(ROOT / 'test_scanners.py')], capture_output=True, timeout=240)
    (output / 'tests.stdout').write_bytes(tests.stdout)
    (output / 'tests.stderr').write_bytes(tests.stderr)
    if tests.returncode:
        raise RuntimeError('scanner unit gates failed; retained test output')
    spec, payloads, raw = make_fixture(output / 'positive-fixture')
    result = subprocess.run([sys.executable, '-I', '-B', str(output / 'positive-fixture/normalizer.py')],
                            input=raw, capture_output=True, check=True, timeout=30)
    positive = json.loads(result.stdout)
    (output / 'positive-fixture/records.json').write_bytes(result.stdout)
    expected_locations = set(LOCATIONS) | set(KEY_LOCATIONS) | {'all-declared-key-copies'}
    # [EXP-ER01-S] Why: gate PASS requires exact fresh controls, inventory coverage and pinned replay bytes.
    # Rejected: exit zero alone, a count-only receipt, or accepting a missing blind-scanner test.
    if positive['status'] != 'PASS' or {row['location'] for row in positive['scans']} != expected_locations:
        raise ValueError('G-S1 positive location coverage did not pass')
    for row in positive['scans']:
        if row['status'] != 'PASS':
            raise ValueError('G-S1 failed scanner: ' + row['location'])
        before = row['observations']['before']
        if row['scan'] == 'P' and before['twinHits'] <= 0:
            raise ValueError('G-S1 missing plaintext twin')
        if row['scan'] == 'C' and before['targetHits'] <= 0:
            raise ValueError('G-S1 missing native envelope')
        if row['scan'] == 'K' and not all(item['targetHits'] > 0 for item in before):
            raise ValueError('G-S1 missing key control')
    blind_spec = copy.deepcopy(spec)
    blind_spec['blindVocabulary'] = True
    blind = replay(output, 'blind-replay', blind_spec, payloads)
    vocab_blind = [row for row in blind['scans'] if row['location'] == 'q-vocabulary']
    if blind['status'] != 'REFUSED' or len(vocab_blind) != 2 or any(row['status'] != 'REFUSED' for row in vocab_blind):
        raise ValueError('G-S2 blind vocabulary falsely accepted')
    d = next(row for row in positive['scans'] if row['scan'] == 'D')
    if d['status'] != 'PASS' or not all(row['opened'] for row in d['observations']['before']):
        raise ValueError('G-S3 target and live control must open before erasure')
    for phase in ('shred', 'rotate'):
        if d['observations'][phase][0]['opened'] or not d['observations'][phase][1]['opened']:
            raise ValueError('G-S3 decryption control/erased-key distinction failed')
    stale_payloads = copy.deepcopy(payloads)
    stale_payloads['rotate']['keys-backup'] = payloads['before']['keys-backup']
    stale_payloads['rotate']['kms-records'] = payloads['before']['kms-records']
    stale = replay(output, 'stale-backup-replay', spec, stale_payloads)
    if next(row for row in stale['scans'] if row['scan'] == 'D')['status'] != 'FAIL':
        raise ValueError('stale usable backup did not fail')
    physical_payloads = copy.deepcopy(payloads)
    physical_payloads['rotate']['d-keys-wal'] = payloads['before']['d-keys-wal']
    physical_payloads['rotate']['kms-wal'] = payloads['before']['kms-wal']
    physical = replay(output, 'physical-retained-key-epoch-replay', spec, physical_payloads)
    if next(row for row in physical['scans'] if row['scan'] == 'D')['status'] != 'FAIL':
        raise ValueError('physical retained wrapped key and epoch did not fail D')
    unknown_spec, unknown_payloads = copy.deepcopy(spec), copy.deepcopy(payloads)
    for location, codec in UNSCANNABLE.items():
        unknown_spec['locations'][location] = {'scans': ['P', 'C'], 'retention': 'remove'}
        item = copy.deepcopy(unknown_spec['inventory']['host-log'])
        item.update(path='/fixture/' + location, location=location, codec=codec)
        unknown_spec['inventory'][location] = item
        for phase in unknown_payloads:
            unknown_payloads[phase][location] = payloads[phase]['host-log']
    unknown = replay(output, 'unknown-codecs-replay', unknown_spec, unknown_payloads)
    if unknown['status'] != 'REFUSED' or any(row['status'] != 'REFUSED' for row in unknown['scans'] if row['location'] in UNSCANNABLE):
        raise ValueError('unknown codec/inaccessible location falsely accepted')
    if any(sha((ROOT / name).read_bytes()) != value for name, value in source_hashes.items()):
        raise RuntimeError('scanner source changed during gate; no PASS receipt')
    records = {'format': 'er01-s-fixture-gates/1', 'runId': spec['runId'], 'slot': spec['slot'],
               'engineContainerId': spec['engineContainerId'], 'generatedAtUnixMs': time.time_ns() // 1000000,
               'claim': 'offline scanner controls only; no product/engine erasure acceptance',
               'unitTestCommand': [sys.executable, '-B', str(ROOT / 'test_scanners.py')],
               'sourceSha256': source_hashes, 'unitTestLogSha256': sha(tests.stderr), 'positiveRawSha256': sha(raw), 'runtimePin': positive['runtimePin'],
               'gates': {'G-S1': 'PASS', 'G-S2': 'PASS', 'G-S3': 'PASS'},
               'positiveScans': len(positive['scans']), 'locationKinds': len(expected_locations),
               'blindObserved': blind['status'], 'staleBackupDObserved': 'FAIL',
               'physicalRetainedKeyEpochDObserved': 'FAIL',
               'unknownCodecLocations': {name: 'REFUSED' for name in UNSCANNABLE},
               'replays': 'Mutations deliberately reuse the fresh fixture attempt; these are adversarial replays, not new collections.'}
    (output / 'gates.json').write_bytes(packed(records) + b'\n')
    manifest = []
    for path in sorted(output.rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            manifest.append({'path': str(path.relative_to(output)), 'bytes': len(data), 'sha256': sha(data)})
    (output / 'SHA256.json').write_bytes(packed({'format': 'er01-s-file-manifest/1', 'files': manifest}) + b'\n')
    print(json.dumps({'output': str(output), **records}, sort_keys=True))


if __name__ == '__main__':
    main()
