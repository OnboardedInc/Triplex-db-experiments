"""Build the pinned v2 kernel; ask the admitted engine for its loader platform."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import sys

import duckdb

ROOT = Path(__file__).resolve().parent
EXTENSION_VERSION = '0.32.0'


def main(output=None, schema_template_reuse=True, schema_borrowed_input=True, *,
         current_unique_fast_path=True, injective_projection_fast_path=True,
         identity_count_fast_path=False, all_cut_unique_fast_path=True, streaming_source_fast_path=True,
         evaluator_profile=False):
    if duckdb.__version__ != '2.0.0':
        raise RuntimeError('exact DuckDB 2.0.0 required')
    with duckdb.connect() as connection:
        platform = connection.execute('PRAGMA platform').fetchone()[0]
    if platform not in ('osx_arm64', 'osx_amd64', 'linux_amd64', 'linux_arm64'):
        raise RuntimeError('unsupported extension loader target')
    output = ROOT / 'build' if output is None else Path(output)
    output.mkdir(exist_ok=True,parents=True)
    catalog=(ROOT/'native/catalog.sql').read_text()
    validity=(ROOT/'native/retained_validity.sql').read_text()
    (output/'catalog_sql.hpp').write_text('#pragma once\ninline constexpr const char TD_CATALOG_SQL[]=R"TD_CATALOG('+catalog+')TD_CATALOG";\n'
        +'inline constexpr const char TD_RETAINED_VALIDITY_SQL[]=R"TD_VALIDITY('+validity+')TD_VALIDITY";\n')
    library = output / 'temporal_datalog.so'
    artifact = output / 'temporal_datalog.duckdb_extension'
    profile_define = '-DTD_EVALUATOR_PROFILE='+str(int(evaluator_profile))
    command = ['c++', '-std=c++17', '-O3', '-DNDEBUG', '-fPIC', '-fvisibility=hidden',
               '-shared', '-fno-fast-math', '-frounding-math', '-ffp-contract=off',
               '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-Wno-missing-field-initializers',
               '-DTD_SCHEMA_TEMPLATE_REUSE='+str(int(schema_template_reuse)),
               '-DTD_SCHEMA_BORROWED_INPUT='+str(int(schema_borrowed_input)),
               '-DTD_CURRENT_UNIQUE_FAST_PATH='+str(int(current_unique_fast_path)),
               '-DTD_INJECTIVE_PROJECTION_FAST_PATH='+str(int(injective_projection_fast_path)),
               '-DTD_IDENTITY_COUNT_FAST_PATH='+str(int(identity_count_fast_path)),
               '-DTD_ALL_CUT_UNIQUE_FAST_PATH='+str(int(all_cut_unique_fast_path)),
               '-DTD_STREAMING_SOURCE_FAST_PATH='+str(int(streaming_source_fast_path)),
               profile_define,
               '-Ivendor', '-Isrc', '-I'+str(output), 'src/temporal_core.cpp', 'src/temporal_schema.cpp', 'src/temporal_command.cpp', 'src/temporal_batch.cpp', 'src/temporal_compat.cpp', 'src/temporal_store_query.cpp', 'src/temporal_datalog.cpp',
               '-o', str(library)]
    subprocess.run(command, cwd=ROOT / 'native', check=True)
    node_executable=Path(subprocess.check_output(['node','-p','process.execPath'],text=True).strip()).resolve()
    node_headers=node_executable.parent.parent/'include/node'
    if not (node_headers/'node_api.h').is_file():
        raise RuntimeError('Node-API headers from the selected Node installation are required')
    control_bridge=output/'temporal_control.node'
    addon=['c++','-std=c++17','-O3','-DNDEBUG','-fPIC','-shared','-fvisibility=hidden',
           '-DNAPI_VERSION=8',profile_define,'-Wall','-Wextra','-Wpedantic','-Werror','-I'+str(node_headers),
           str(ROOT/'native/src/node_control.cpp'),'-o',str(control_bridge)]
    addon+=['-undefined','dynamic_lookup'] if platform.startswith('osx') else ['-ldl']
    subprocess.run(addon,check=True)
    subprocess.run([sys.executable, str(ROOT / 'native/vendor/append_extension_metadata.py'),
                    '-l', str(library), '-n', 'temporal_datalog', '-o', str(artifact),
                    '-p', platform, '-dv', 'v2.0.0', '-ev', EXTENSION_VERSION,
                    '--abi-type', 'C_STRUCT_UNSTABLE'], check=True, capture_output=True)
    # Project artifact identity only; no environment inventory.
    manifest = {'engine': '2.0.0', 'extension_version': EXTENSION_VERSION, 'abi': 'C_STRUCT_UNSTABLE',
                'catalog_sql_sha256':hashlib.sha256((output/'catalog_sql.hpp').read_bytes()).hexdigest(),
                'control_bridge_sha256':hashlib.sha256(control_bridge.read_bytes()).hexdigest(),'node_api_version':8,
                'schema_template_reuse':bool(schema_template_reuse),
                'schema_borrowed_input':bool(schema_borrowed_input),
                'diagnostic_evaluator_profile':bool(evaluator_profile),
                'experimental_current_unique_fast_path':bool(current_unique_fast_path),
                'experimental_injective_projection_fast_path':bool(injective_projection_fast_path),
                'experimental_identity_count_fast_path':bool(identity_count_fast_path),
                'experimental_all_cut_unique_fast_path':bool(all_cut_unique_fast_path),
                'experimental_streaming_source_fast_path':bool(streaming_source_fast_path),
                'source_sha256':{str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest()
                    for path in sorted((ROOT/'native/src').glob('*')) if path.suffix in ('.cpp','.hpp')},
                'library_sha256': hashlib.sha256(library.read_bytes()).hexdigest(),
                'extension_sha256': hashlib.sha256(artifact.read_bytes()).hexdigest()}
    (output / 'artifact.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--with-evaluator-profile',action='store_true',help='Build opt-in native evaluator scope timers')
    main(evaluator_profile=parser.parse_args().with_evaluator_profile)
