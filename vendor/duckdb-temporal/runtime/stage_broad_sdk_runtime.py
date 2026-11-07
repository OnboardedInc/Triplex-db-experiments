"""Prepare/verify exact broad-benchmark runtime copies; never opens DuckDB."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
TASK = ROOT.parents[3]
NATIVE_COMMIT = 'c3ff1d73398b46cc7019465f78fc44f7e598670a'
SQL_NAME = 'native/retained_validity.sql'
SQL_SHA = 'b0bd0524469bb53b88feaddc4ae0782b9bb97e99c3aa056720e0cdc67a7767f4'
NATIVE_SOURCE = TASK / 'temporal-native-write-cohort-20261105/projects/temporal-datalog/runtime'
BINDING_ROOT = TASK / 'temporal-read-scheduling-20261105/projects/temporal-datalog/runtime'
SUBJECTS = {
    'b0': {
        'archive': NATIVE_SOURCE / 'build/native-write-frozen-032-20261105',
        'inventory': 'b17f748f92f8fa94bd5b9218602993e8b0e5f4b9ab863b38d7941fb11769580b',
        'binding': 'antijoin-sdk-control-10m-16-20261105.json',
        'binding_sha': '5db1d86dcbbb791926631cbf4f018683fd3a3cc2b29b5237dcfe9afa35a9e6aa',
        'source': NATIVE_SOURCE,
    },
    'sdk': {
        'archive': TASK / 'temporal-thread-budget-20261105/projects/temporal-datalog/runtime/build/sdk-admission-frozen-032-20261105',
        'inventory': '8f1bfbcb69409f308a74a32a62f787693739798cc0c72df3710d92dba3798d71',
        'binding': 'antijoin-sdk-candidate-10m-16-20261105.json',
        'binding_sha': 'bc6394cee5a6f7e6caa57635fe1377cd94105c58ce5565257d8ef9f2add63596',
        'source': TASK / 'temporal-thread-budget-20261105/projects/temporal-datalog/runtime',
    },
}
HARNESS = {
    'adapter/benchmark-scale.mjs': 'b3b5d27b0576397b8839506a73bbb52614e94e20f625aea04433b3d884a1af0c',
    'adapter/scale-fixture.mjs': '1a5fc8d5eb6e7387ab5b5957c677ef7bbc9588eaabcabd40c426af047a61e1a2',
    'adapter/mixed-scale-fixture.mjs': '7a02c2a834aa46be232f14a1681e1ad59c39501b295cda36f87447966454de09',
    'adapter/clone-benchmark-fixture.mjs': '4a30f6deb087600432794d2ac07305cb7e3a4d2e8bedc9f041d0dea75144a5b6',
    'adapter/clone-benchmark-fixture.py': 'ae8a9d1028c8174d46bcea345c98d038e3e97884e82332801f8cf51a3fc383ad',
}
RESOLVE_ENGINE = """
import {createRequire} from 'node:module';
import {join,dirname} from 'node:path';
const runtime=process.argv[1];
const own=createRequire(join(runtime,'build/adapter/native-duckdb-port.mjs'));
const api=own.resolve('@duckdb/node-api'), ar=createRequire(api);
const bindings=ar.resolve('@duckdb/node-bindings'), br=createRequire(bindings);
const platform=br.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');
console.log(JSON.stringify({api,bindings,platform,engine:join(dirname(platform),'libduckdb.dylib')}));
"""


def digest(path):
    result = sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1048576), b''):
            result.update(chunk)
    return result.hexdigest()


def exact(actual, expected, label):
    if actual != expected:
        raise RuntimeError(label + ': actual and expected differ')


def tracked_bytes(source, commit, name):
    repository = Path(subprocess.check_output(
        ['git', 'rev-parse', '--show-toplevel'], cwd=source, text=True).strip())
    relative = (source.relative_to(repository) / name).as_posix()
    return subprocess.check_output(['git', 'show', commit + ':' + relative], cwd=source)


def inspect_archive(subject):
    archive = subject['archive']
    manifest = archive / 'SHA256SUMS'
    exact(digest(manifest), subject['inventory'], 'frozen inventory')
    entries = dict(line.split('  ', 1)[::-1] for line in manifest.read_text().splitlines())
    exact(len(entries), len(manifest.read_text().splitlines()), 'unique inventory paths')
    exact(len(entries), 445, 'declared frozen inventory entries')
    actual = {}
    for name, expected in entries.items():
        path = archive / name
        if path.is_symlink() or not path.is_file():
            raise RuntimeError('nonregular archived entry: ' + name)
        actual[name] = digest(path)
        exact(actual[name], expected, 'frozen file ' + name)
    runtime = {name.removeprefix('runtime/'): value for name, value in entries.items()
               if name.startswith('runtime/')}
    source = {name.removeprefix('source/'): value for name, value in entries.items()
              if name.startswith('source/')}
    other = {name: value for name, value in entries.items()
             if not name.startswith(('runtime/', 'source/'))}
    exact(set(other), {'archive.json'}, 'inventory sidecar classification')
    # Every source reference is checked; the generated header has no Git object.
    git_refs = {}
    for name, expected in source.items():
        if name == 'build/catalog_sql.hpp':
            exact(runtime[name], expected, 'generated source/runtime header')
        else:
            observed = sha256(tracked_bytes(NATIVE_SOURCE, NATIVE_COMMIT, name)).hexdigest()
            exact(observed, expected, 'native source at c3 ' + name)
            git_refs[name] = observed
    binding_file = BINDING_ROOT / 'evidence' / subject['binding']
    exact(digest(binding_file), subject['binding_sha'], 'artifact reference binding')
    binding = json.loads(binding_file.read_text())['selectedArtifact']
    sdk_refs = {}
    for name, expected in binding['sourceInputs'].items():
        exact(digest(subject['source'] / name), expected, 'actual SDK source ' + name)
        exact(sha256(tracked_bytes(subject['source'], binding['sourceCommit'], name)).hexdigest(),
              expected, 'SDK source commit ' + name)
        sdk_refs[name] = expected
    return {'archive': str(archive), 'inventorySha256': subject['inventory'],
            'declaredFiles': actual, 'runtimeFiles': runtime, 'sourceReferences': source,
            'nonRuntimeSidecars': other, 'nativeSourceCommit': NATIVE_COMMIT,
            'nativeGitReferences': git_refs, 'sdkSourceCommit': binding['sourceCommit'],
            'sdkSourceReferences': sdk_refs, 'artifactReference': binding,
            'bindingSha256': subject['binding_sha']}


def inspect_stage(stage, archive):
    # Set equality catches additions as well as missing files. No symlink,
    # hidden-file, package-file or source-reference exclusion is implicit.
    actual, directories = {}, []
    for path in sorted(stage.rglob('*')):
        name = path.relative_to(stage).as_posix()
        if path.is_symlink():
            raise RuntimeError('unexpected staged symlink: ' + name)
        if path.is_dir():
            directories.append(name)
        elif path.is_file():
            actual[name] = digest(path)
        else:
            raise RuntimeError('nonregular staged path: ' + name)
    expected = {**archive['runtimeFiles'], SQL_NAME: SQL_SHA}
    exact(actual, expected, 'complete actual staged file mapping')
    core = json.loads((stage / 'build/artifact.json').read_text())
    owner = json.loads((stage / 'build/owner_probe/artifact.json').read_text())
    exact(owner['integrity_sources_sha256'][SQL_NAME], SQL_SHA, 'owner source SQL pin')
    exact(actual['build/catalog_sql.hpp'], core['catalog_sql_sha256'], 'actual compiled header')
    header = (stage / 'build/catalog_sql.hpp').read_text()
    marker = 'inline constexpr const char TD_RETAINED_VALIDITY_SQL[]=R"TD_VALIDITY('
    embedded = header.split(marker, 1)[1].split(')TD_VALIDITY";', 1)[0].encode()
    exact(sha256(embedded).hexdigest(), SQL_SHA, 'compiled retained SQL bytes')
    pins = archive['artifactReference']['runtimePins']
    for name, path in {'core_extension': 'build/temporal_datalog.duckdb_extension',
                       'companion_extension': 'build/owner_probe/temporal_owner_probe.duckdb_extension',
                       'control_bridge': 'build/temporal_control.node',
                       **{'adapter/' + name: 'build/adapter/' + name for name in
                          ['native-entity.js', 'native-schema.js', 'native-duckdb-port.mjs']}}.items():
        exact(actual[path], pins[name], 'actual staged artifact ' + name)
    for file, key in [('build/artifact.json', 'coreManifestSha256'),
                      ('build/owner_probe/artifact.json', 'companionManifestSha256')]:
        exact(actual[file], archive['artifactReference'][key], 'actual staged manifest')
    # Resolve the package chain without importing native bindings or opening DBs.
    resolved = json.loads(subprocess.check_output(
        ['node', '--input-type=module', '-e', RESOLVE_ENGINE, str(stage)], text=True))
    resolved_files = {}
    for name, value in resolved.items():
        relative = Path(value).resolve().relative_to(stage.resolve()).as_posix()
        exact(digest(Path(value)), actual[relative], 'actual resolved SDK file ' + name)
        resolved_files[name] = {'relativePath': relative, 'sha256': actual[relative]}
    exact(resolved_files['engine']['sha256'], pins['engine_library'], 'actual SDK engine')
    exact(core['extension_sha256'], pins['core_extension'], 'core manifest artifact')
    exact(core['control_bridge_sha256'], pins['control_bridge'], 'core manifest bridge')
    exact(owner['extension_sha256'], pins['companion_extension'], 'owner manifest artifact')
    exact(owner['core_extension_sha256'], pins['core_extension'], 'owner/core pairing')
    exact(owner['engine_library_sha256'], pins['engine_library'], 'owner/engine pairing')
    return {'runtime': str(stage), 'actualFiles': actual, 'directories': directories,
            'expectedFiles': expected, 'exactSetAndByteEquality': True,
            'resolvedSdkFiles': resolved_files, 'onlyAddedFile': SQL_NAME,
            'coreManifest': core, 'companionManifest': owner}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'verify'])
    parser.add_argument('--stage-root', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    stage_root, receipt = args.stage_root.resolve(), args.receipt.resolve()
    stage_root.relative_to(ROOT / 'build')
    if receipt.exists():
        parser.error('receipt must be fresh')
    if args.operation == 'prepare' and stage_root.exists():
        parser.error('staging root must be fresh')
    exact({name: digest(ROOT / name) for name in HARNESS}, HARNESS, 'five measured source files')
    archives = {role: inspect_archive(subject) for role, subject in SUBJECTS.items()}
    exact(archives['b0']['sourceReferences'], archives['sdk']['sourceReferences'], 'shared native source')
    if args.operation == 'prepare':
        stage_root.mkdir(parents=True, exist_ok=False)
        for role, archive in archives.items():
            parent = stage_root / role
            parent.mkdir()
            stage = parent / 'runtime'
            subprocess.run(['/bin/cp', '-cR', str(Path(archive['archive']) / 'runtime'), str(stage)], check=True)
            for path in [stage, *stage.rglob('*')]:
                if path.is_symlink():
                    raise RuntimeError('unexpected copied symlink: ' + str(path))
                os.chmod(path, path.stat().st_mode | 0o200)
            (stage / 'native').mkdir()
            sql = Path(archive['archive']) / 'source' / SQL_NAME
            exact(digest(sql), SQL_SHA, 'archived missing SQL source')
            (stage / SQL_NAME).write_bytes(sql.read_bytes())
    stages = {role: inspect_stage(stage_root / role / 'runtime', archive)
              for role, archive in archives.items()}
    report = {'schema': 'td.sdk-broad-runtime-staging/1', 'operation': args.operation,
              'recordedAtUtc': datetime.now(timezone.utc).isoformat(),
              'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'harnessPins': HARNESS, 'archives': archives, 'stages': stages,
              'reason': 'Unchanged scale driver reads native/retained_validity.sql before clone stages.',
              'nativeBuild': 'none', 'installation': 'none', 'engineExecution': 'none',
              'packageResolution': 'createRequire/resolve only; no native module import',
              'counts': {role: {'inventory': len(a['declaredFiles']), 'runtime': len(a['runtimeFiles']),
                                'source': len(a['sourceReferences']), 'sidecars': len(a['nonRuntimeSidecars']),
                                'actualStagedRuntime': len(stages[role]['actualFiles'])}
                         for role, a in archives.items()}}
    receipt.parent.mkdir(parents=True, exist_ok=True)
    with receipt.open('x') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'receipt': str(receipt), 'counts': report['counts']}))


if __name__ == '__main__':
    main()
