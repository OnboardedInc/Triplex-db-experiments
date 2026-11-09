"""Hash retained DI01 evidence after all writers and the readback audit have ended."""
import datetime
import hashlib
import json
import pathlib
import shutil
import uuid

ROOT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01')
REPO = pathlib.Path.cwd()
assert shutil.disk_usage('.').free >= 5 * 1024**3
assert json.loads((ROOT / 'BUILDER-CHECKS.json').read_text())['status'] == 'PASS'
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
out = ROOT / ('inventory-' + str(uuid.uuid4()))
out.mkdir()

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while data := stream.read(1024 * 1024):
            h.update(data)
    return h.hexdigest()

# [EXP-DI01] Why: preserve the actual completed logs before inventory. Rejected: hashing an open trace or readback log (a changing digest).
logs = ROOT / 'logs'
logs.mkdir(exist_ok=True)
for p in ROOT.parent.glob('DI01-*.log'):
    shutil.copy2(p, logs / p.name)

# [EXP-DI01] Why: keep generated gate receipts in durable evidence, outside the source branch. Rejected: removing the only receipt (unrecoverable evidence).
with (out / 'generated-receipt-retention.jsonl').open('x') as receipt:
    for name in ['G0-datomic-20261109T070543Z-e2bcef', 'G0-datomic-20261109T071437Z-c6e724']:
        original = REPO / 'lab/runs/G0' / (name + '.json')
        retained = ROOT / 'g0' / name / 'receipt.json'
        if original.exists():
            original_hash = digest(original)
            assert original_hash == digest(retained)
            receipt.write(json.dumps(dict(original=str(original), retained=str(retained), sha256=original_hash)) + '\n')
            receipt.flush()
            original.unlink()

# [EXP-DI01] Why: bind every retained byte, including failed attempts. Rejected: a manifest of only success summaries (missing forensic coverage).
files = sorted(p for p in ROOT.rglob('*') if p.is_file() and not p.is_relative_to(out))
size = 0
with (out / 'SHA256SUMS').open('x') as manifest:
    for p in files:
        before = p.stat()
        value = digest(p)
        after = p.stat()
        assert (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns), p
        manifest.write(value + '  ' + str(p.relative_to(ROOT)) + '\n')
        size += before.st_size
result = dict(kind='retained-evidence-inventory', started=started, finished=datetime.datetime.now(datetime.timezone.utc).isoformat(), files=len(files), bytes=size, manifest=str(out / 'SHA256SUMS'), manifestSha256=digest(out / 'SHA256SUMS'), excludedCurrentInventory=str(out), controllerSha256=digest(pathlib.Path(__file__)))
(out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
important = [ROOT / p for p in ['BUILDER-CHECKS.json', 'final-r4/binding.json', 'final-r4/cases/result.json', 'final-r4/crash/result.json', 'final-r8/binding.json', 'final-r8/lag/result.json', 'final-r12/binding.json', 'final-r12/trace/result.json', 'final-r11/FAILURE.json', 'g0/G0-datomic-20261109T071437Z-c6e724/receipt.json', 'compression-r12-readmission.jsonl', 'compression-r12-stopped.jsonl', 'query-plan.json', 'query-plan-old.json']]
important += [out / 'SHA256SUMS', out / 'result.json', out / 'generated-receipt-retention.jsonl']
audit = json.loads((ROOT / 'BUILDER-CHECKS.json').read_text())
important += [pathlib.Path(audit['auditAttempt']) / 'result.json']
for name in ['BRIEF.md', 'changed-path-hashes.json', 'audit.py', 'inventory.py']:
    important.append(REPO / 'lab/experiments/EXP-DI01' / name)
with (REPO / 'lab/experiments/EXP-DI01/SHA256SUMS').open('w') as manifest:
    for p in important:
        name = str(p.relative_to(REPO)) if p.is_relative_to(REPO) else str(p)
        manifest.write(digest(p) + '  ' + name + '\n')
print(json.dumps(result, indent=2))
