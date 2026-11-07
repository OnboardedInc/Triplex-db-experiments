"""Create a fresh full-verification runtime from one exact integration commit."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import stat
import subprocess

MAIN = Path('[LOCAL_PATH_0021]')
PREFIX = 'projects/temporal-datalog/runtime/'
QUALIFIED = MAIN.parent / 'temporal-native-writer-regression-20261106' / PREFIX
CAPTURE = QUALIFIED / 'build/qualification-writer435-full-20261106-01/before-full-first.json'
RUN = Path(__file__).resolve().parent

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=MAIN)

def exclusive_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as out:
        out.write(data)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-commit', required=True)
    args = parser.parse_args()
    commit = git('rev-parse', args.source_commit + '^{commit}').decode().strip()
    inputs = json.loads((RUN / 'source-inputs.json').read_text())
    for name, expected in inputs['files'].items():
        assert hashlib.sha256(git('show', commit + ':' + PREFIX + name)).hexdigest() == expected, name
    snapshot = json.loads(CAPTURE.read_text())
    assert len(snapshot['runtime']) == 583
    stage = RUN / 'runtime'
    stage.mkdir()
    sources = {}
    for raw_name in git('ls-tree', '-r', '--name-only', '-z', commit, '--', PREFIX).split(b'\0'):
        if not raw_name:
            continue
        name = raw_name.decode()
        relative = name.removeprefix(PREFIX)
        if Path(relative).parts[0] in ('build', 'node_modules', 'evidence'):
            continue
        content = git('show', commit + ':' + name)
        exclusive_bytes(stage / relative, content)
        sources[relative] = hashlib.sha256(content).hexdigest()
    for relative, expected in snapshot['runtime'].items():
        source = QUALIFIED / relative
        assert stat.S_ISREG(source.lstat().st_mode) and not source.is_symlink(), relative
        assert source.suffix not in ('.duckdb', '.wal'), relative
        assert digest(source) == expected, relative
        target = stage / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with source.open('rb') as incoming, target.open('xb') as out:
            shutil.copyfileobj(incoming, out, length=1024 * 1024)
        assert digest(target) == expected and digest(source) == expected, relative
    routes = snapshot['external']['routes']
    assert len(routes) == 5
    for relative, value in routes.items():
        target = stage / 'node_modules' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.symlink_to(value['literalTarget'])
        assert str(target.resolve()) == value['resolvedTarget'], relative
    for relative, item in snapshot['external']['selectedEntries'].items():
        assert digest(Path(item['resolved'])) == item['sha256'], relative
    for name, item in snapshot['external']['headers'].items():
        assert digest(Path(item['file'])) == item['sha256'], name
    node = snapshot['external']['node']
    assert digest(Path(node['file'])) == node['sha256']
    resolution_script = """
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
const require=createRequire(join(process.argv[1],'build/adapter/native-duckdb-port.mjs'));
const api=require.resolve('@duckdb/node-api');
const bindings=createRequire(api).resolve('@duckdb/node-bindings');
const platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');
process.stdout.write(JSON.stringify({api,bindings,platform,engine:join(dirname(platform),'libduckdb.dylib')}));
"""
    actual_resolution = json.loads(subprocess.check_output(
        [node['file'], '--input-type=module', '-e', resolution_script, str(stage)]))
    for name, value in actual_resolution.items():
        path = Path(value)
        relative = str(path.relative_to(stage))
        assert digest(path) == snapshot['runtime'][relative], name
    core = json.loads((stage / 'build/artifact.json').read_text())
    owner = json.loads((stage / 'build/owner_probe/artifact.json').read_text())
    assert core['extension_sha256'] == owner['core_extension_sha256']
    for name, expected in core['source_sha256'].items():
        assert digest(stage / name) == expected, name
    code_suffixes = {'.py', '.cpp', '.hpp', '.h', '.ts', '.mts', '.mjs', '.sql', '.json'}
    code = {name: value for name, value in sources.items() if Path(name).suffix in code_suffixes}
    report = dict(schema='td.native-writer-integrated-stage/1', sourceCommit=commit,
                  exactSelectedWriterSources=25, sourceFiles=len(sources), codePins=code,
                  runtimeFiles=583, runtimePins=snapshot['runtime'], external=snapshot['external'],
                  actualSdkResolution=actual_resolution,
                  stage=str(stage), nativeBuild='none', install='none', engine='not run',
                  boundary='Exact Git source plus previously qualified immutable runtime map; no databases copied.')
    exclusive_bytes(RUN / 'stage-first.json', (json.dumps(report, indent=2) + '\n').encode())
    print(json.dumps({'sourceCommit': commit, 'codePins': len(code), 'runtimeFiles': 583,
                      'stage': str(stage), 'engine': 'not run'}))

if __name__ == '__main__':
    main()
