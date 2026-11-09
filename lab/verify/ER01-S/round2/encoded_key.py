#!/usr/bin/env python3
"""Extend the nested-JSON finding to a usable key in a separate declared file."""
import base64
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ROOT = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round2')
sys.path.insert(0, str(REPO / 'lab/observer/erasure'))
from compile import compile_normalizer
from fixtures import make_frames, fixture_record_file, packed


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    output = ROOT / 'encoded-key-01'
    output.mkdir(parents=True, exist_ok=False)
    pins = json.loads((ROOT / 'probe-02/source-pins.json').read_bytes())
    for rel, pin in pins['sourceSha256'].items():
        assert sha((REPO / rel).read_bytes()) == pin
    own_pin = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'encoded-key-executed.py')
    spec = json.loads((ROOT / 'probe-02/nominal/case.json').read_bytes())
    payloads = {}
    for line in (ROOT / 'probe-02/nominal/raw.jsonl').read_bytes().splitlines():
        frame = json.loads(line)
        sample = json.loads(base64.b64decode(frame['rawBase64']))
        payloads[sample['phase']] = {v['fileId']: base64.b64decode(v['bytes']) for v in sample['files']}
    keys = json.loads(payloads['before']['keys-backup'])['rows']
    row = next(k for k in keys if k['epoch'] == 2 and k['keyId'] != keys[-1]['keyId'])
    epochs = json.loads(payloads['rotate']['kms-records'])['rows']
    epoch = next(e for e in epochs if e['epoch'] == 2)
    # [CX-VER01S-R2] Why: JSON/hex decoding and authenticated opening must be independent of observer helpers.
    # Rejected: treating the expected before-key byte string alone as proof that the new source is usable.
    proof_input = {'root': payloads['rotate']['root'].decode(), 'key': row, 'epoch': epoch, 'envelope': spec['envelopes'][0]}
    proof_script = HERE.parent / 'rewrap.mjs'
    proof = json.loads(subprocess.check_output(['node', str(proof_script)], input=packed(proof_input)))
    assert proof['independentlyOpenedSha256'] == spec['envelopes'][0]['plainSha256']
    (output / 'independent-input.json').write_bytes(packed(proof_input))
    (output / 'independent-proof.json').write_bytes(packed(proof))
    outcomes = []
    for encoding in ('hex', 'base64'):
        raw_key = base64.b64decode(row['wrapped'])
        text = raw_key.hex() if encoding == 'hex' else row['wrapped']
        escaped = ''.join('\\u%04x' % ord(char) for char in text)
        log = ('INFO box={"value":"' + escaped + '"}').encode()
        decoded = json.loads(log[len(b'INFO box='):])['value']
        recovered = bytes.fromhex(decoded) if encoding == 'hex' else base64.b64decode(decoded)
        assert recovered == raw_key
        changed = copy.deepcopy(payloads)
        controls = [base64.b64decode(k['control']) for k in spec['keyNeedles'] if k['kind'] == 'wrapped']
        changed['rotate']['d-keys-heap'] = fixture_record_file(controls + [log])
        directory = output / encoding
        directory.mkdir()
        raw = make_frames(spec, changed, directory)
        parser = compile_normalizer(spec)
        (directory / 'raw.jsonl').write_bytes(raw)
        (directory / 'case.json').write_bytes(packed(spec))
        (directory / 'normalizer.py').write_bytes(parser)
        proc = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')], input=raw, capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(proc.stdout)
        (directory / 'stderr').write_bytes(proc.stderr)
        assert proc.returncode == 0, proc.stderr
        record = json.loads(proc.stdout)
        (directory / 'records.json').write_bytes(proc.stdout)
        scans = [v for v in record['scans'] if v['scan'] == 'D' or (v['scan'] == 'K' and v['location'] == 'd-keys-heap')]
        comparison = {'encoding': encoding, 'aggregateObserved': record['status'],
            'keySha256': sha(recovered), 'independentlyOpenedSha256': proof['independentlyOpenedSha256'],
            'rawSha256': sha(raw), 'parserSha256': sha(parser),
            'scans': [{'scan': v['scan'], 'status': v['status'], 'unparsedBytes': sum(f['unparsedBytes'] for p in v['coverage'].values() for f in p.values())} for v in scans],
            'unsafe': any(v['status'] == 'PASS' for v in scans),
            'claim': 'same usable wrapper, legal JSON Unicode escapes, distinct declared key and envelope files'}
        (directory / 'comparison.json').write_bytes(packed(comparison))
        outcomes.append(comparison)
        print(encoding + ': ' + record['status'] + (' UNSAFE' if comparison['unsafe'] else ''), flush=True)
    for rel, pin in pins['sourceSha256'].items():
        assert sha((REPO / rel).read_bytes()) == pin
    assert sha(Path(__file__).read_bytes()) == own_pin
    (output / 'summary.json').write_bytes(packed({'candidate': pins['candidate'], 'runId': spec['runId'], 'scenarios': outcomes,
        'verifierSha256': own_pin, 'independentDecryptorSha256': sha(proof_script.read_bytes())}))
    lines = [sha(p.read_bytes()) + '  ' + str(p.relative_to(output)) for p in sorted(output.rglob('*')) if p.is_file()]
    (output / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
