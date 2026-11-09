#!/usr/bin/env python3
"""Real default-bound fixture checks, using frozen candidate bytes and independent inverses."""
import argparse
import base64
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys

from matrix import REPO, SOURCE, sha, save
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import fixture_record_file, make_frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, type=Path)
    ap.add_argument('--attempt', default='boundary-02')
    args = ap.parse_args()
    root = args.root.resolve()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    assert Path(args.attempt).name == args.attempt
    output = root / args.attempt
    output.mkdir(parents=True, exist_ok=False)
    own_pin = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'boundary-executed.py')
    matrix = root / 'matrix-01'
    pins = json.loads((matrix / 'source-pins.json').read_bytes())
    for rel, digest in pins['observerSources'].items():
        assert sha((REPO / rel).read_bytes()) == digest
    spec = json.loads((matrix / 'fixture/case.json').read_bytes())
    frozen = (matrix / 'frozen-normalizer.py').read_bytes()
    ns = {'__name__': 'review_boundary'}
    exec(frozen, ns)
    assert ns['SPEC'] == spec
    bound = ns['VIEW_DEPTH_LIMIT']
    assert bound == 32
    payloads = {}
    for line in (matrix / 'fixture/raw.jsonl').read_bytes().splitlines():
        sample = json.loads(base64.b64decode(json.loads(line)['rawBase64']))
        payloads[sample['phase']] = {v['fileId']: base64.b64decode(v['bytes']) for v in sample['files']}
    marker, twin = (base64.b64decode(spec['plain'][key]) for key in ('target', 'twin'))
    results = []
    # [CX-VER01S-5] Why: independently prove depth exhaustion for two additional real 33-layer byte strings.
    # Rejected: a reduced test limit or assuming a repeated ASCII varint adds an actual layer.
    for name in ('backslash-hex', 'quoted-printable'):
        value = marker
        for depth in range(bound + 1):
            if name == 'backslash-hex':
                value = (b'\\x' + ('%02x' % marker[0]).encode() + marker[1:]) if depth == 0 else value.replace(b'\\', b'\\x5c')
            else:
                value = (b'=' + ('%02X' % marker[0]).encode() + marker[1:]) if depth == 0 else value.replace(b'=', b'=3D')
        expected = value
        for _ in range(bound + 1):
            if name == 'backslash-hex':
                assert expected.startswith(b'\\x')
                expected = bytes([int(expected[2:4], 16)]) + expected[4:]
            else:
                assert expected.startswith(b'=')
                expected = bytes([int(expected[1:3], 16)]) + expected[3:]
        assert expected == marker
        directory = output / name
        directory.mkdir()
        (directory / 'encoded.bin').write_bytes(value)
        views, _, issues = ns['supplemental_views'](value)
        changed = copy.deepcopy(payloads)
        changed['rotate']['host-log'] = fixture_record_file([twin, spec['envelopes'][1]['envelope'].encode(), value])
        raw = make_frames(spec, changed, directory)
        parser = compile_normalizer(spec)
        (directory / 'raw.jsonl').write_bytes(raw)
        (directory / 'normalizer.py').write_bytes(parser)
        save(directory / 'case.json', spec)
        process = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
            input=raw, capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(process.stdout)
        (directory / 'stderr').write_bytes(process.stderr)
        assert process.returncode == 0, process.stderr
        record = json.loads(process.stdout)
        save(directory / 'records.json', record)
        row = next(v for v in record['scans'] if v['scan'] == 'P' and v['location'] == 'host-log')
        coverage = row['coverage']['rotate']['host-log']
        result = {'encoding': name, 'layers': bound + 1, 'inputSha256': sha(value), 'inputBytes': len(value),
            'rawSha256': sha(raw), 'parserSha256': sha(parser), 'decodedSha256': sha(expected),
            'directFound': any(marker in v for v in [value] + views), 'directIssues': issues,
            'status': row['status'], 'aggregateStatus': record['status'], 'rotateCoverage': coverage,
            'protectedHits': row['observations']['rotate']['protectedHits']}
        save(directory / 'comparison.json', result)
        results.append(result)
        print(json.dumps(result), flush=True)
    for rel, digest in pins['observerSources'].items():
        assert sha((REPO / rel).read_bytes()) == digest
    assert sha(Path(__file__).read_bytes()) == own_pin
    qualified = all(v['status'] == v['aggregateStatus'] == 'REFUSED' and
        v['rotateCoverage']['unparsedBytes'] == v['rotateCoverage']['size'] and
        any('budget' in issue for issue in v['directIssues']) for v in results)
    save(output / 'summary.json', {'candidate': pins['candidate'], 'runId': spec['runId'],
        'results': results, 'qualified': qualified, 'verifierSha256': own_pin,
        'claim': 'offline fixture-bound refusal controls only'})
    (output / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(output))
        for p in sorted(output.rglob('*')) if p.is_file()) + '\n')
    assert qualified, 'default-bound controls failed; observations retained'


if __name__ == '__main__':
    main()
