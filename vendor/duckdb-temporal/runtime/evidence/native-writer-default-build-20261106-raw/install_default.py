"""Install the qualified default build, retaining every replaced build file."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import stat

RUN = Path(__file__).resolve().parent
ROOT = RUN.parent.parent

def sha(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()

accepted = json.loads((RUN / 'accepted-full-first.json').read_text())
info = json.loads((RUN / 'stage-first.json').read_text())
assert accepted['status'] == 'passed_first435'
stage = Path(info['stage'])
selected = {}
omitted = []
for name, expected in info['runtimePins'].items():
    if not name.startswith('build/'):
        assert sha(ROOT / name) == expected, name
        continue
    if name.startswith('build/adapter/') and name.endswith('.mjs') and not (ROOT / 'adapter' / Path(name).name).exists():
        omitted.append(name)
        continue
    assert sha(stage / name) == expected, name
    selected[name] = expected
assert len(selected) == 181 and len(omitted) == 7
for name, expected in info['codePins'].items():
    assert sha(ROOT / name) == expected, name
installation = RUN / 'default-install-01'
installation.mkdir()
previous = {}
# Finish every backup before replacing any default artifact.
for name in selected:
    target = ROOT / name
    if not target.exists():
        previous[name] = None
        continue
    assert stat.S_ISREG(target.lstat().st_mode) and not target.is_symlink(), name
    backup = installation / 'previous' / name
    backup.parent.mkdir(parents=True, exist_ok=True)
    with target.open('rb') as source, backup.open('xb') as out:
        shutil.copyfileobj(source, out, length=1024 * 1024)
    previous[name] = sha(target)
    assert sha(backup) == previous[name], name
with (installation / 'before.json').open('x') as output:
    json.dump(dict(previousFiles=previous, omittedExperimentalBuildFiles=omitted), output, indent=2)
    output.write('\n')
for name, expected in selected.items():
    target = ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + '.writer-install-01')
    with (stage / name).open('rb') as source, temporary.open('xb') as out:
        shutil.copyfileobj(source, out, length=1024 * 1024)
    assert sha(temporary) == expected, name
    os.replace(temporary, target)
after = {name: sha(ROOT / name) for name in selected}
assert after == selected
for name, expected in info['runtimePins'].items():
    if name.startswith('node_modules/'):
        assert sha(ROOT / name) == expected, name
result = dict(schema='td.native-writer-default-build/1', status='installed_exact_qualified_bytes',
              sourceCommit=accepted['sourceCommit'], reportSha256=accepted['reportSha256'],
              installedFiles=181, dependencyFilesUnchanged=395, omittedExperimentalBuildFiles=omitted,
              after=after, previousFiles=previous,
              scope='Generated default build only; all replaced build files retained. No database or canonical fixture changed.')
with (installation / 'accepted-first.json').open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps({key: result[key] for key in ['status', 'sourceCommit', 'installedFiles', 'dependencyFilesUnchanged']}))
