"""Run the first exact integration verification and retain its terminal result."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import stat
import subprocess
import time

RUN = Path(__file__).resolve().parent
MAIN_RUNTIME = RUN.parent.parent
PYTHON = '[LOCAL_PATH_0034]'
NODE_DIR = '[LOCAL_PATH_0114]'

def sha(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()

def save(name, value):
    with (RUN / name).open('x') as output:
        json.dump(value, output, indent=2)
        output.write('\n')

stage_info = json.loads((RUN / 'stage-first.json').read_text())
stage = Path(stage_info['stage'])
assert stage_info['sourceCommit'] == '1d6378e2c6e9b74b024fe5ba89c6b26355990dea'
assert json.loads((RUN / 'stage-first-terminal.json').read_text())['exitCode'] == 0
assert not (stage / 'evidence/verification.json').exists()
for name, expected in stage_info['codePins'].items():
    assert sha(stage / name) == expected, name
baseline = MAIN_RUNTIME / 'evidence/verification.json'
before = sha(baseline)
assert before == 'aced40cd39edf63c2af8bc0a2ff53d76746b9a741ffb089cbbb9e8a9fb1244d6'
environment = dict(os.environ, PATH=NODE_DIR + os.pathsep + os.environ['PATH'],
                   UV_THREADPOOL_SIZE='4', PYTHONDONTWRITEBYTECODE='1',
                   TD_SDK_ADMISSION_SOURCE=str(MAIN_RUNTIME / 'build/scale-runs/20261105T185235542Z-394378fd/facts-100000.duckdb'),
                   TD_SDK_ADMISSION_RECIPE=str(MAIN_RUNTIME / 'build/expanded-value-integration/mixed-100k-026-checkpoint-fixed.json'),
                   TD_TEST_PRE_BATCH_BUILD=str(MAIN_RUNTIME / 'build/retained-diagnostics-20261105/accepted-026'))
environment.pop('NODE_OPTIONS', None)
for name in list(environment):
    if name.startswith('TD_NATIVE_WRITER_LAB_'):
        environment.pop(name)
save('before-full-first.json', dict(sourceCommit=stage_info['sourceCommit'],
     codePins=stage_info['codePins'], runtimePins=stage_info['runtimePins'],
     mainBaselineSha256=before, environment={name: environment[name] for name in
       ('UV_THREADPOOL_SIZE', 'TD_SDK_ADMISSION_SOURCE', 'TD_SDK_ADMISSION_RECIPE', 'TD_TEST_PRE_BATCH_BUILD')}))
command = [PYTHON, '-B', 'verify.py', '--with-direct']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
with (RUN / 'full-first.stdout.log').open('x') as out, (RUN / 'full-first.stderr.log').open('x') as err:
    child = subprocess.Popen(command, cwd=stage, env=environment, stdout=out, stderr=err)
    save('full-first-start.json', dict(command=command, cwd=str(stage), pid=child.pid, startedAtUtc=started))
    print(json.dumps({'pid': child.pid, 'startedAtUtc': started, 'sourceCommit': stage_info['sourceCommit']}), flush=True)
    code = child.wait()
terminal = dict(command=command, cwd=str(stage), pid=child.pid, exitCode=code,
               startedAtUtc=started, exitedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
               elapsedMs=(time.monotonic()-tick)*1000)
save('full-first-terminal.json', terminal)
assert sha(baseline) == before
runtime_after = {name: sha(stage / name) for name in stage_info['runtimePins']}
code_after = {name: sha(stage / name) for name in stage_info['codePins']}
save('after-full-first.json', dict(runtimePins=runtime_after, codePins=code_after, mainBaselineSha256=sha(baseline)))
assert runtime_after == stage_info['runtimePins']
assert code_after == stage_info['codePins']
if code:
    print(json.dumps({'status': 'failed_first_verifier', 'terminal': terminal}), flush=True)
    raise SystemExit(code)
report_path = stage / 'evidence/verification.json'
report = json.loads(report_path.read_text())
methods = sum(value['methods'] for value in report.values() if isinstance(value, dict) and 'methods' in value)
methods += sum(value['methods'] for value in report['scale_and_readers'].values())
assert methods == 391 and report['triplex']['cases'] == 44
assert report['typescript_semantic_check'] == 'PASS'
assert report['source_sha256'] == stage_info['codePins']
result = dict(schema='td.native-writer-integrated-full/1', status='passed_first435',
              sourceCommit=stage_info['sourceCommit'], methods=methods, triplexCases=44, checks=435,
              sourcePins=len(report['source_sha256']), reportSha256=sha(report_path), terminal=terminal,
              unchangedRuntimeFiles=len(runtime_after), main405Unchanged=True,
              scope='Exact integration Git source; fresh owned stage; reused matching native bytes; no native build or install.')
save('accepted-full-first.json', result)
print(json.dumps(result), flush=True)
