import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path.cwd()
here = root / 'lab/experiments/EXP-DF01/live'
attempt = here / 'attempt-001'
durable = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/live-attempt-001')
assert not durable.exists(), 'Refuse evidence replacement'
assert os.statvfs(root).f_bavail * os.statvfs(root).f_frsize >= 5 * 1024**3
durable.mkdir()
sha = lambda b: hashlib.sha256(b).hexdigest()
slots = json.loads((root / 'lab/config/slots.json').read_text())['lanes']['datomic']
container = json.loads((attempt / 'container.json').read_text())[0]
final = json.loads((attempt / 'container-final.json').read_text())[0]
env = dict(s.split('=', 1) for s in container['Config']['Env'])
health = json.loads((attempt / 'health.json').read_text())
assert container['Image'] == final['Image'] == slots['imageId']
assert container['Id'] == final['Id']
assert env['GATEWAY_SOURCE_SHA256'] == health['gatewaySourceHash']
assert any(m.get('Name') == 'tx2-datomic-dev-data' and m['Destination'] == '/data' for m in container['Mounts'])
assert 'CX-DF01-live' in json.dumps(container['Config']['Labels'])
assert 'slot lock released' in (attempt / 'down.log').read_text()
assert 'retained volume tx2-datomic-dev-data' in (attempt / 'post-status.log').read_text()
state = json.loads((attempt / 'conformance-state.json').read_text())
assert state['result'] == 'DIAGNOSTIC-FAIL' and 'doubleValue()' in state['error']
assert 'TransactionRejected' in (attempt / 'conformance.log').read_text()
receipt_path = Path((attempt / 'build.log').read_text().split('"receipt": "')[-1].split('"')[0])
receipt = json.loads(receipt_path.read_text())
assert receipt['imageId'] == slots['imageId']
assert receipt['sourceInputsSha256'] == slots['sourceInputsSha256']
for entry in receipt['sources']['gateway']:
    assert sha((root / 'packages/datomic/gateway' / entry['path']).read_bytes()) == entry['sha256']
shutil.copyfile(receipt_path, durable / 'build-receipt.json')
shutil.copyfile(root / 'lab/config/slots.json', durable / 'slots.json')
shutil.copyfile(here / 'conformance.mjs', durable / 'executed-conformance.mjs')
for name in ['core', 'host', 'testkit', 'datomic']:
    shutil.copytree(root / 'packages' / name / 'dist', durable / 'built-packages' / name)
old = subprocess.check_output(['git', 'show', 'HEAD:lab/config/slots.json'])
new = (root / 'lab/config/slots.json').read_bytes()
(here / 'SOURCE-SHA256.tsv').write_text('path\told_sha256\tnew_sha256\nlab/config/slots.json\t' + sha(old) + '\t' + sha(new) + '\n')
summary = dict(label='DIAGNOSTIC', result='DIAGNOSTIC-FAIL', firstFailure='conformance fixture rejected before feed audit',
    sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    imageId=slots['imageId'], containerId=container['Id'], gatewaySourceSha256=health['gatewaySourceHash'],
    holder='CX-DF01-live', volume='tx2-datomic-dev-data',
    observedCommandExitCodes={'build': 0, 'up': 0, 'conformance': 1, 'down': 0, 'fstrim': 0, 'docker-context': 0},
    unrun=['excision', 'peer restart and log-only resume', 'non-Triplex skipped', 'real report-queue deadline cases', 'G1'],
    durable=str(durable), indexedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    builtAssetsNote='Post-attempt byte retention; no before/after execution-stability claim.')
(here / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
files = sorted(p for p in durable.rglob('*') if p.is_file())
(here / 'DURABLE-SHA256SUMS').write_text(''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(durable)) + '\n' for p in files))
print(json.dumps(summary, indent=2))
