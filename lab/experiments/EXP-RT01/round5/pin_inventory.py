import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round5/pins1')
OUT.mkdir(parents=True, exist_ok=False)

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def blob(ref, path):
    result = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=ROOT, capture_output=True)
    return result.stdout if result.returncode == 0 else None

def sha(data):
    return hashlib.sha256(data).hexdigest() if data is not None else None

main = git('rev-parse', 'main').decode().strip()
head = git('rev-parse', 'HEAD').decode().strip()
fork = git('merge-base', main, head).decode().strip()
review = git('rev-parse', 'contract/0.3.14').decode().strip()
authority_bytes = blob(main, 'lab/acceptance/obligations.json')
authority = json.loads(authority_bytes)
pins = []

def add(path, digest, location):
    if re.fullmatch('[a-f0-9]{64}', digest):
        pins.append({'path': path, 'sha256': digest, 'location': location})

def walk(value, location=''):
    if isinstance(value, list):
        for i, item in enumerate(value):
            walk(item, f'{location}/{i}')
    elif isinstance(value, dict):
        if isinstance(value.get('path'), str) and isinstance(value.get('sha256'), str):
            add(value['path'], value['sha256'], location)
        for key, item in value.items():
            if '/' in key and isinstance(item, str):
                add(key, item, f'{location}/{key}')
            if '/' in key and isinstance(item, dict) and isinstance(item.get('sha256'), str):
                add(key, item['sha256'], f'{location}/{key}')
            walk(item, f'{location}/{key}')

walk(authority)
direct_entries = len(pins)
direct_paths = len({p['path'] for p in pins})
# [EXP-RT01] Why: file-list manifests bind their members as well as their own bytes. Rejected: limiting the inventory to the three familiar O-TESTKIT projections.
seen = set()
while True:
    manifests = sorted({p['path'] for p in pins if 'SHA256SUMS' in p['path']} - seen)
    if not manifests:
        break
    for manifest in manifests:
        seen.add(manifest)
        content = blob(main, manifest)
        assert content is not None, manifest
        for line in content.decode().splitlines():
            match = re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)', line)
            if match:
                path = match[2]
                # Manifest paths are repository-relative in this contract.
                assert blob(main, path) is not None, (manifest, path)
                add(path, match[1], f'manifest:{manifest}')

paths = []
for path in sorted({p['path'] for p in pins}):
    main_bytes = blob(main, path)
    fork_bytes = blob(fork, path)
    current = ROOT / path
    branch_bytes = current.read_bytes() if current.is_file() else None
    classification = ('unchanged' if main_bytes == branch_bytes else
                      'RT01-change' if fork_bytes != branch_bytes else 'upstream-only-divergence')
    paths.append({'path': path, 'mainSha256': sha(main_bytes), 'branchSha256': sha(branch_bytes),
                  'forkSha256': sha(fork_bytes), 'classification': classification,
                  'pins': [p for p in pins if p['path'] == path]})
rt01 = [p for p in paths if p['classification'] == 'RT01-change']
assert [p['path'] for p in rt01] == ['packages/testkit/src/index.ts']
assert git('diff', fork, '--', 'lab/acceptance', 'lab/oracles/replay') == b''

for name, args in [('testkit-main.diff', ('diff', main, '--', rt01[0]['path'])),
                   ('testkit-RT01.diff', ('diff', fork, '--', rt01[0]['path'])),
                   ('testkit-0314.diff', ('diff', main, review, '--', rt01[0]['path']))]:
    (OUT / name).write_bytes(git(*args))
review_bytes = blob(review, rt01[0]['path'])
review_contract = json.loads(blob(review, 'lab/acceptance/obligations.json'))
result = {'main': main, 'mainContractVersion': authority['version'], 'head': head, 'fork': fork,
          'authoritySha256': sha(authority_bytes), 'reviewContract': review,
          'reviewContractVersion': review_contract['version'],
          'reviewTestkitPin': review_contract['oracleFilesPinned']['O-TESTKIT'],
          'reviewTestkitBlobSha256': sha(review_bytes),
          'directPinEntries': direct_entries, 'directPinnedPaths': direct_paths,
          'expandedPinEntries': len(pins), 'expandedPinnedPaths': len(paths),
          'expandedManifests': sorted(seen), 'paths': paths,
          'protectedBranchDeltaAgainstFork': []}
(OUT / 'inventory.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['main','mainContractVersion','directPinEntries','directPinnedPaths','expandedPinEntries','expandedPinnedPaths']}))
for item in paths:
    if item['classification'] != 'unchanged':
        print(item['classification'], item['path'], item['mainSha256'], item['branchSha256'])
