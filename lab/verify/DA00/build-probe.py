import hashlib
import json
import os
import pathlib
import shutil
import subprocess

# [CX-VDA00] Why: reproduce context reuse with a harmless extra file and no Docker mutation. Rejected: altering the retained shared build context.
here = pathlib.Path(__file__).resolve().parent
repo = here.parents[2]
slots = repo / 'lab/config/slots.json'
before = slots.read_bytes()
pins = json.loads(before)['lanes']['datomic']
engine = here / 'evidence/context-fixture'
context = engine / 'datomic-build' / pins['buildInputsSha256']
assert not engine.exists()
(context / 'datomic').mkdir(parents=True)
(context / 'datomic/UNVERIFIED-CX-VDA00').write_text('Harmless verifier-only bytes absent from the ZIP and all build input manifests.\n')
tools = here / 'build-tools'
tools.mkdir(exist_ok=True)
(tools / 'docker').symlink_to('../build-probe-docker.mjs')
os.chmod(here / 'build-probe-docker.mjs', 0o755)
env = {**os.environ, 'TX2_CONFIG_DIR': str(repo), 'TX2_ENGINE_DIR': str(engine), 'PATH': str(tools) + ':' + os.environ['PATH']}
try:
    run = subprocess.run(['node', 'lab/bin/engine.mjs', 'build', '--lane', 'datomic'], cwd=repo, env=env, capture_output=True, text=True)
    (here / 'evidence/build-context-probe.log').write_text(run.stdout + run.stderr)
    assert run.returncode == 1
    result = json.loads((here / 'evidence/build-context-probe.json').read_text())
    assert pins['buildInputsSha256'] in result['args'][result['args'].index('--build-arg') + 1]
    assert slots.read_bytes() == before
    print(json.dumps({'reproduced': True, 'engineExit': run.returncode, 'noRealDockerCall': True, 'slotsUnchanged': True, 'unmanifestedSha256': result['unmanifestedSha256']}, indent=2))
finally:
    # Only this never-launched fixture is removed; its command and marker receipt remain.
    shutil.rmtree(engine)
