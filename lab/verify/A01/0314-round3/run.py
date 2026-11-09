"""[CX-VA01-0314] Why: retain fresh execution facts and exact source bytes. Rejected: exit-zero semantic verdicts."""
import hashlib, json, os, pathlib, shutil, subprocess, sys, time, uuid

R = pathlib.Path(__file__).resolve().parents[4]
D = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314/round3')
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.check_output(['git', *a], cwd=R)

def inputs():
    files = git('ls-files', '-z').decode().split('\0')
    return {p: sha((R/p).read_bytes()) for p in sorted(files) if p and not p.startswith('lab/runs/') and (R/p).is_file()}

def capture_g0(out, receipt):
    x = json.loads(receipt.read_bytes())
    assert x['git']['head'] == git('rev-parse', 'HEAD').decode().strip()
    assert x['slot'] is None and x['gate'] == 'G0'
    dest = out/'g0'; dest.mkdir()
    shutil.copyfile(receipt, dest/'receipt.json')
    shutil.copytree(R/x['rawDir'], dest/'raw')
    for obj in x['objects']:
        src = R/'runs/objects'/obj['sha256']; b = src.read_bytes()
        assert len(b) == obj['bytes'] and sha(b) == obj['sha256']
        target = dest/'objects'/obj['sha256']; target.parent.mkdir(exist_ok=True)
        if not target.exists(): target.write_bytes(b)
    manifest = R/x['build']['manifest']
    assert sha(manifest.read_bytes()) == x['build']['manifestSha256']
    for pkg in json.loads(manifest.read_bytes())['packages'].values():
        for f in pkg['list']:
            b = (R/f['path']).read_bytes()
            assert len(b) == f['bytes'] and sha(b) == f['sha256']
            target = dest/'build'/f['path']; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(b)
    (dest/'SHA256SUMS').write_text(''.join(sha(f.read_bytes())+'  '+str(f.relative_to(dest))+'\n' for f in sorted(dest.rglob('*')) if f.is_file()))
    return {'runId': x['runId'], 'verdict': x['verdict'], 'counts': x['counts'], 'sourceHead': x['git']['head'], 'slot': x['slot']}

if __name__ == '__main__':
    label, *command = sys.argv[1:]
    free = shutil.disk_usage(R).free
    if free < 5*1024**3: raise SystemExit('REFUSED: less than 5 GiB host disk free')
    out = D/(label+'-'+str(uuid.uuid4())); out.mkdir(parents=True)
    before = inputs()
    record = {'label': label, 'command': command, 'cwd': str(R), 'startEpoch': time.time(), 'head': git('rev-parse', 'HEAD').decode().strip(), 'main': git('rev-parse', 'main').decode().strip(), 'sourceBefore': before, 'diskFreeBefore': free, 'offlineSlot': None}
    old_receipts = set((R/'lab/runs/G0').glob('*.json'))
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', V_P2Q_OUT=str(out/'p2q'), SQL01_ATTEMPT=label)
    with (out/'command.log').open('xb') as log:
        code = subprocess.call(['node', 'lab/bin/heavy.mjs', '--label', 'CX-VA01-0314-R3-'+label, '--poll-ms', '100', '--', *command], cwd=R, env=env, stdout=log, stderr=log)
    record.update(exitCode=code, endEpoch=time.time(), sourceAfter=inputs(), logSha256=sha((out/'command.log').read_bytes()))
    record['sourceUnchanged'] = record['sourceBefore'] == record['sourceAfter']
    new = set((R/'lab/runs/G0').glob('*.json'))-old_receipts
    if label.startswith('g0-'):
        assert len(new) == 1, new
        record['g0'] = capture_g0(out, new.pop())
    (out/'execution.json').write_text(json.dumps(record, indent=2)+'\n')
    print(json.dumps({k: v for k, v in record.items() if k not in ('sourceBefore', 'sourceAfter')}, indent=2))
    print('evidence:', out)
    sys.exit(code)
