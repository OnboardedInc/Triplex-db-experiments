#!/usr/bin/env python3
"""Reproduce the real absent-artifact branch without changing active source/builds."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile

IMPLEMENTATION = Path('/workspace/scratch/497cfb3c035e/temporal-roadmap-20261030/implementation')
LAB = Path('/tmp/temporal-roadmap-research/iteration-01')
WHEEL = Path('/tmp/temporal-datalog-20261030/engine/python2')
FROZEN = {
    'storage/typed_store.py': '7135d22e2da65717b51c4a511c3b5c6642e9c28b966ec92aca1756aa06782de6',
    'storage/schema_v2.sql': '6c23294e685d7f17a69ccaf6de813f96235e6301cd57ac6ed8f21c8137d91135',
    'storage/tests/test_typed_store.py': '54ede493644526557c6a450f436fa66ca71484717b73ce859eaa77f9fd324d42',
    'storage/tests/migration_adapter.py': 'bb51bd48819f1f902fdcaec2fc773f6119609256dc3672df6d0f601af840e51f',
}

CHILD = r'''
from pathlib import Path
import hashlib
import json
import os
import sys
import duckdb
import store as legacy
import typed_store as typed

if not __debug__:
    raise RuntimeError('Assertions are required; do not use Python -O')
storage = Path.cwd().resolve()
project = storage.parent
assert typed.ROOT == storage and legacy.ROOT == storage
assert Path(typed.__file__).resolve() == storage / 'typed_store.py'
assert Path(legacy.__file__).resolve() == storage / 'store.py'
assert typed.TRUSTED_EXTENSION == project / 'engine/build/temporal_datalog.duckdb_extension'
assert legacy.TRUSTED_EXTENSION == typed.TRUSTED_EXTENSION
assert not (project / 'engine').exists(), 'The separate project must genuinely have no artifact tree'
assert duckdb.__version__ == '2.0.0'

observations = []
expected_message = 'genuine typed td_query_v2 artifact is not available; evaluation is UNRUN'

def unavailable(action, stage):
    try:
        action()
    except typed.NativeUnavailable as error:
        assert type(error) is typed.NativeUnavailable
        assert str(error) == expected_message
        observations.append(dict(stage=stage, exception_type=type(error).__module__ + '.' + type(error).__name__,
                                 message=str(error)))
    else:
        raise AssertionError('Missing artifact did not raise exact NativeUnavailable: ' + stage)

outside = project / 'must-not-be-created.duckdb'
assert not outside.exists()
try:
    typed.TypedTemporalStore(outside)
except typed.StoreError as error:
    assert str(error) == 'database must be a .duckdb file inside the storage directory'
else:
    raise AssertionError('Copied real module lost its actual ROOT confinement')
assert not outside.exists()

database = storage / 'data/absence.duckdb'
program = 'answer(?e,?a,?v) :- triple(?e,?a,?v).'
values = [typed.Value.string('1'), typed.Value.boolean(True), typed.Value.int64(9223372036854775807),
          typed.Value.float64(-0.0), typed.Value.float64(5e-324)]
with typed.TypedTemporalStore(database) as store:
    assert store.path == database.resolve() and store.schema_version == 2 and store.position == 0
    unavailable(lambda: store.query(typed.Query(program, 0)), 'fresh_public_query')
    receipt = store.transact('absence/persist', assertions=[typed.TypedFact('e', 'a', value, 0, 10) for value in values])
    assert receipt.position == 1 and len(receipt.asserted_ids) == len(values)
    assert store.receipt('absence/persist') == (1, receipt.inserted_at)
    assert [row['v'] for row in store.history()] == values
    history_before_close = store.history_json()
    assert all(type(row[name]) is str for row in history_before_close
               for name in ('valid_from', 'valid_to', 'tx_from', 'tx_to'))
    json.dumps(history_before_close, allow_nan=False)
    unavailable(lambda: store.query(typed.Query(program, 0, 1)), 'persisted_public_query')
    unavailable(lambda: store.query_json(typed.Query(program, 0, 1)), 'public_query_json')

with typed.TypedTemporalStore(database) as store:
    assert store.position == 1 and store.history_json() == history_before_close
    assert store.receipt('absence/persist') == (1, receipt.inserted_at)
    unavailable(lambda: store.query(typed.Query(program, 0, 1)), 'reopened_public_query')
    before = store.position, store.history_json(), store.receipts()
    unavailable(lambda: store.transact('absence/must-rollback',
        assertions=[typed.TypedFact('new', 'a', typed.Value.int64(1))], evaluate=typed.Query(program, 0)),
        'public_transact_evaluate_rollback')
    assert (store.position, store.history_json(), store.receipts()) == before
    assert store.receipt('absence/must-rollback') is None

with typed.TypedTemporalStore(database) as store:
    assert store.position == 1 and store.history_json() == history_before_close
    assert store.receipt('absence/must-rollback') is None

assert not (project / 'engine').exists()
spill = database.with_suffix('.spill')
spill_after_close = sum(p.stat().st_size for p in spill.rglob('*') if p.is_file()) if spill.exists() else 0
assert spill_after_close == 0
physical = sum(p.stat().st_size for p in storage.rglob('*') if p.is_file() and
               (p == database or p == Path(str(database) + '.wal') or spill in p.parents))
assert physical <= typed.MAX_DATA_BYTES
print(json.dumps(dict(status='PASS', python=sys.version, duckdb_version=duckdb.__version__,
    module_files={'legacy': str(Path(legacy.__file__).resolve()), 'typed': str(Path(typed.__file__).resolve())},
    actual_storage_root=str(storage), trusted_extension=str(typed.TRUSTED_EXTENSION), engine_directory_exists=False,
    database=str(database), persisted_position=1, persisted_assertions=len(values),
    persistence_reopen_passed=True, failed_evaluation_rolled_back=True, path_confinement_passed=True,
    exact_unavailable_observations=observations, spill_bytes_after_close=spill_after_close,
    physical_bytes_after_close=physical), indent=2, allow_nan=False))
'''


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    if not __debug__:
        raise RuntimeError('Assertions are required')
    before = {p: digest(IMPLEMENTATION / p) for p in FROZEN}
    assert before == FROZEN, 'Do not run against drifted implementation sources'
    active = IMPLEMENTATION / 'engine/build/temporal_datalog.duckdb_extension'
    active_before = digest(active)
    run = Path(tempfile.mkdtemp(prefix='storage-missing-artifact-', dir=LAB))
    storage = run / 'project/storage'
    storage.mkdir(parents=True)
    copied = {}
    for name in ('store.py', 'typed_store.py', 'schema.sql', 'schema_v2.sql'):
        source, destination = IMPLEMENTATION / 'storage' / name, storage / name
        shutil.copyfile(source, destination)
        assert digest(source) == digest(destination)
        copied[name] = dict(source=str(source), destination=str(destination), sha256=digest(source))
    runner = run / 'child.py'
    runner.write_text(CHILD)
    environment = os.environ.copy()
    environment.update(PYTHONPATH=str(WHEEL), PYTHONDONTWRITEBYTECODE='1', PYTHONNOUSERSITE='1')
    command = [sys.executable, '-B', '-']
    reproduction = 'cd ' + shlex.quote(str(storage)) + ' && PYTHONPATH=' + shlex.quote(str(WHEEL)) + \
        ' PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 ' + shlex.join(command) + ' < ' + shlex.quote(str(runner))
    result = subprocess.run(command, input=CHILD, text=True, cwd=storage, env=environment,
                            capture_output=True, timeout=90)
    (run / 'stdout.json').write_text(result.stdout)
    (run / 'stderr.log').write_text(result.stderr)
    after = {p: digest(IMPLEMENTATION / p) for p in FROZEN}
    copies_after = {name: digest(storage / name) for name in copied}
    child = json.loads(result.stdout) if result.returncode == 0 else None
    passed = (result.returncode == 0 and child.get('status') == 'PASS' and before == after
              and active_before == digest(active)
              and all(copies_after[name] == row['sha256'] for name, row in copied.items()))
    report = dict(format='typed-storage-missing-artifact-isolated-process-v1',
        captured_at=datetime.now(timezone.utc).isoformat(), status='PASS' if passed else 'FAIL',
        run_directory=str(run), reproduction_command=reproduction, child_argv=command,
        child_cwd=str(storage), child_pythonpath=str(WHEEL), child_returncode=result.returncode,
        child_runner_sha256=digest(runner), copied_sources=copied,
        frozen_implementation_sha256_before=before, frozen_implementation_sha256_after=after,
        active_artifact_sha256_before=active_before, active_artifact_sha256_after=digest(active),
        implementation_sources_unchanged=before == after, active_artifact_unchanged=active_before == digest(active),
        child=child, stdout=str(run / 'stdout.json'), stderr=str(run / 'stderr.log'),
        no_monkeypatch_or_root_override=True, no_evaluator_substitute=True,
        scope='Separate genuine copied module environment; not a native-feature/performance or production-readiness pass')
    destination = LAB / 'storage-missing-artifact-report.json'
    destination.write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print(json.dumps(dict(status=report['status'], report=str(destination), run_directory=str(run),
                         returncode=result.returncode, child_status=child.get('status') if child else None,
                         exact_boundary_observations=len(child['exact_unavailable_observations']) if child else 0)))
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
