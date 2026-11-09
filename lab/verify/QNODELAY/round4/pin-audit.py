# [CX-VQNODELAY-R4] Why: inspect both object and path-keyed contract pins without a bulk byte fingerprint.
# Rejected: assuming all contract hashes use only {path, sha256} (dictionary pins also exist).
import json
from pathlib import Path
import re
import subprocess

changed = set(subprocess.check_output(
    ['git', 'diff', '--name-only', '4e235a1^', '4e235a1'], text=True).splitlines())
files = subprocess.check_output(['git', 'ls-files', 'lab/acceptance'], text=True).splitlines()
matches, references = [], []


def walk(value, source, trail=''):
    if isinstance(value, dict):
        for key in ['path', 'file', 'source']:
            if isinstance(value.get(key), str) and value[key] in changed and isinstance(value.get('sha256'), str):
                matches.append({'source': source, 'trail': trail, 'pin': value})
        for key, child in value.items():
            if key in changed and isinstance(child, str) and re.fullmatch('[a-f0-9]{64}', child):
                matches.append({'source': source, 'trail': trail, 'path': key, 'sha256': child})
            walk(child, source, trail + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            walk(child, source, trail + '/' + str(i))


for file in files:
    text = Path(file).read_text()
    for path in sorted(changed):
        if path in text:
            references.append({'source': file, 'changedPath': path})
    if file.endswith('.json'):
        walk(json.loads(text), file)

result = {
    'kind': 'lightweight contract pin/reference metadata inspection, no bulk fingerprint',
    'candidate': '4e235a1d2b7ec5e1360144cab05357a79ee127ad',
    'changedPaths': sorted(changed),
    'changedPinMatches': matches,
    'changedPathReferences': references,
    'trackedAcceptanceFiles': len(files),
}
with Path('lab/verify/QNODELAY/round4/pin-audit-result.json').open('x') as output:
    output.write(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
