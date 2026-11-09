#!/usr/bin/env python3
"""Finalize the review evidence index after independent encoded-key regressions."""
import hashlib
import json
from pathlib import Path
import shutil
from validate import read_manifest, ROOT, HERE, REPO, packed


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    # [CX-VER01S-R2] Why: supplemental results must be content-verified before changing the short index.
    # Rejected: appending a successful process status without reading its retained inputs and output.
    old = json.loads((HERE / 'INDEX.json').read_bytes())
    readbacks = [read_manifest(Path(entry['path']), entry['manifestSha256']) for entry in old['readbacks']]
    readbacks.append(read_manifest(ROOT / 'encoded-key-01'))
    source = json.loads((ROOT / 'probe-02/source-pins.json').read_bytes())
    for relative, pin in source['sourceSha256'].items():
        assert sha((REPO / relative).read_bytes()) == pin, relative
    assert sha((HERE / 'probe.py').read_bytes()) == source['verifierSha256']
    validation = json.loads((ROOT / 'validation-01/summary.json').read_bytes())
    assert sha((HERE / 'validate.py').read_bytes()) == validation['verifierSha256']
    encoded = json.loads((ROOT / 'encoded-key-01/summary.json').read_bytes())
    assert sha((HERE / 'encoded_key.py').read_bytes()) == encoded['verifierSha256']
    assert sha((HERE.parent / 'rewrap.mjs').read_bytes()) == encoded['independentDecryptorSha256']
    assert encoded['runId'] == old['fixtureRunId']
    unsafe = old['unsafeScenarios'] + ['encoded-key/' + s['encoding'] for s in encoded['scenarios'] if s['unsafe']]
    index = {**old, 'newProbeScenarios': old['newProbeScenarios'] + len(encoded['scenarios']),
        'readbacks': readbacks, 'unsafeScenarios': unsafe,
        'findings': {'R2-F1': 'superseded WAL frame assigned final-image coverage',
                     'R2-F2': 'escaped JSON string leaves omitted from plaintext/key search views'}}
    (HERE / 'INDEX.json').write_bytes(packed(index) + b'\n')
    lines = [entry['manifestSha256'] + '  ' + str(Path(entry['path']) / 'SHA256SUMS') for entry in readbacks]
    for path in sorted(HERE.iterdir()):
        if path.is_file() and path.name not in ('SHA256SUMS', 'finalization.stdout', 'finalization.stderr'):
            lines.append(sha(path.read_bytes()) + '  ' + str(path))
    report = HERE.parent / 'VERIFY-round2.md'
    lines.append(sha(report.read_bytes()) + '  ' + str(report))
    (HERE / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps(index, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()
