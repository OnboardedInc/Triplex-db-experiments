import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path.cwd()
here = root / 'lab/experiments/EXP-DF01/live'
attempt = here / 'attempt-002'
peer = attempt / 'peer'
durable = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/live-attempt-002')
assert not durable.exists(), 'Refuse evidence replacement'
assert os.statvfs(root).f_bavail * os.statvfs(root).f_frsize >= 5 * 1024**3
sha = lambda b: hashlib.sha256(b).hexdigest()
preflight = json.loads((peer / 'preflight.json').read_text())
for name, digest in preflight['inputs'].items():
    assert sha((root / name).read_bytes()) == digest, name
container = json.loads((peer / 'container.json').read_text())[0]
final = json.loads((peer / 'container-final.json').read_text())[0]
slots = json.loads((root / 'lab/config/slots.json').read_text())['lanes']['datomic']
env = dict(s.split('=', 1) for s in container['Config']['Env'])
health = json.loads((peer / 'health.json').read_text())
assert container['Image'] == final['Image'] == slots['imageId']
assert container['Id'] == final['Id']
assert env['GATEWAY_SOURCE_SHA256'] == health['gatewaySourceHash']
assert 'CX-DF01-live-002' in json.dumps(container['Config']['Labels'])
assert any(m.get('Name') == 'tx2-datomic-dev-data' and m['Destination'] == '/data' for m in container['Mounts'])
assert 'slot lock released' in (peer / 'down.log').read_text()
assert 'retained volume tx2-datomic-dev-data' in (peer / 'post-status.log').read_text()
state = json.loads((peer / 'conformance-state.json').read_text())
assert state['result'] == 'DIAGNOSTIC-PASS'
assert state['audit'] == {'positions': 2, 'resolutions': 2}
assert len(state['writeReports']) == len(state['pages']) == 2
assert state['deleted']['deleted'] is True
assert '1 tests containing 6 assertions' in (attempt / 'offline/test.log').read_text()
assert '0 failures, 0 errors' in (attempt / 'offline/test.log').read_text()
assert json.loads((attempt / 'offline/result.json').read_text())['exitCode'] == 0
assert ':stage "prepared"' in (peer / 'excision.log').read_text()
assert ':stage "queued-before-peer-exit"' in (peer / 'queue-restart-prepare.log').read_text()
assert ':queuedCount 1' in (peer / 'before-peer-restart.edn').read_text()
assert ':stage "resumed"' in (peer / 'resume.log').read_text()
assert ':deleted true' in (peer / 'resume.log').read_text()
deadline_log = (peer / 'deadlines.log').read_text()
for case in ['stale-report-new-log-entry', 'older-report-no-new-entry', 'report-before-readable-cut',
             'no-report-new-log-entry', 'logical-one-ns-before-deadline', 'logical-exact-deadline', 'cleanup']:
    assert ':case "' + case + '"' in deadline_log, case
assert not subprocess.check_output(['git', 'diff', '1b110023', '--', 'lab/experiments/EXP-DF01/live/attempt-001'])
outcomes = json.loads((attempt / 'outcomes.json').read_text())
durable.mkdir()
run = 'G1-datomic-20261109T095731Z-d254a0'
receipt_path = root / 'lab/runs/G1' / (run + '.json')
receipt = json.loads(receipt_path.read_text())
assert receipt['verdict'] == 'PASS' and not receipt['reasons']
assert receipt['counts']['pass'] == receipt['counts']['executed'] == 88
assert receipt['counts']['fail'] == receipt['counts']['skip'] == 0
assert receipt['routeEquivalence']['passed'] == 1
assert receipt['engine']['containerId'] == container['Id']
assert receipt['engine']['holder'] == 'CX-DF01-live-002'
assert receipt['engine']['imageId'] == slots['imageId']
assert receipt['contactedEndpoint'] == 'http://127.0.0.1:8470'
shutil.copytree(root / 'runs/G1' / run, durable / 'G1/raw')
shutil.copyfile(receipt_path, durable / 'G1/receipt.json')
for entry in receipt['objects']:
    digest = entry['sha256']
    source = root / 'runs/objects' / digest
    assert sha(source.read_bytes()) == digest
    destination = durable / 'objects' / digest
    destination.parent.mkdir(exist_ok=True)
    shutil.copyfile(source, destination)
    assert sha(destination.read_bytes()) == digest
regression_oracle = root / 'lab/experiments/EXP-DA01/round5/oracle/seed-29-c22567a4-3ea1-4dad-b7e1-320d0c86e2a2'
shutil.copytree(regression_oracle, durable / 'regression-oracle')
for source in regression_oracle.rglob('*'):
    if source.is_file():
        assert sha(source.read_bytes()) == sha((durable / 'regression-oracle' / source.relative_to(regression_oracle)).read_bytes())
# [EXP-DF01] Why: this run's generated oracle directory exceeds 5 MB; retain verified bytes durably. Rejected: committing the raw directory or removing unverified evidence.
shutil.rmtree(regression_oracle)
for name in ['core', 'host', 'testkit', 'datomic']:
    shutil.copytree(root / 'packages' / name / 'dist', durable / 'built-packages' / name)
for source in [here / 'conformance.mjs', here / 'fixture.mjs', here / 'check-fixture.mjs', here / 'fixture_test.clj',
               here / 'queue_restart_prepare.clj', here / 'deadlines.clj', root / 'lab/config/slots.json']:
    shutil.copyfile(source, durable / source.name)
for name in ['queue_restart_prepare.clj', 'deadlines.clj']:
    # [EXP-DF01] Why: retain stdin probe preimages separately from the initial client/source manifest. Rejected: retroactively claiming they were in that earlier manifest.
    assert sha((here / name).read_bytes()) == sha((durable / name).read_bytes())
summary = dict(label='DIAGNOSTIC', outcomes=outcomes, sourceHead=preflight['head'],
    imageId=slots['imageId'], containerId=container['Id'], gatewaySourceSha256=health['gatewaySourceHash'],
    holder='CX-DF01-live-002', volume='tx2-datomic-dev-data', inputsStable=True,
    G1RunId=run, G1Counts=receipt['counts'],
    durable=str(durable), indexedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    limits=['Exact deadline tests use a synthetic monotonic clock with real Peer cuts, tx-range and queue.',
            'External stdin probes were authored during this attempt; their retained preimages are indexed after execution, not in the initial preflight manifest.',
            'Dev storage is diagnostic only; no production or contract acceptance.'])
(attempt / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
files = sorted(p for p in durable.rglob('*') if p.is_file())
(attempt / 'DURABLE-SHA256SUMS').write_text(''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(durable)) + '\n' for p in files))
print(json.dumps(summary, indent=2))
