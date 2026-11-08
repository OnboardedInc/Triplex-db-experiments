# [EXP-P2Q] Why: retain exact source hashes, commands and first failures for this narrow rerun.
# Rejected: console-only results (cannot bind the reviewed sources to observed outcomes).
import hashlib, json, os, pathlib, shutil, subprocess, time
root = pathlib.Path.cwd()
out = root / 'lab/experiments/EXP-P2Q-qlever-log-broker/evidence-round3/process-access-retry'
out.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
for key in ['QLEVER_COMMIT_PATH', 'QLEVER_INTEGRATION', 'V_P2Q_LIVE']:
    env.pop(key, None)
env.update(V_P2Q_OUT=str(out / 'reviewer'), V_P2Q_RUNS=str(root / 'runs/broker/CX-P2Q-R3'), V_P2Q_SEEDS='60')
files = subprocess.check_output(['git', 'ls-files', 'packages/qlever', 'lab/verify/P2Q', 'pnpm-lock.yaml', 'vitest.workspace-aliases.ts'], text=True).splitlines()
files += ['packages/qlever/test/broker-answer-errors.test.ts', 'lab/verify/P2Q/tests/round3.test.ts']
def hashes():
    return {f: hashlib.sha256((root / f).read_bytes()).hexdigest() for f in sorted(set(files))}
tasks = [
 ('unit', ['node_modules/.bin/vitest', 'run', '--root', 'packages/qlever']),
 ('typecheck', ['node_modules/.bin/tsc', '--noEmit', '-p', 'packages/qlever/tsconfig.json']),
 ('reviewer-regressions', ['node_modules/.bin/vitest', 'run', '--config', 'lab/verify/P2Q/vitest.config.ts', 'tests/round3.test.ts']),
 ('verifier-offline', ['node_modules/.bin/vitest', 'run', '--config', 'lab/verify/P2Q/vitest.config.ts']),
 ('light-live', ['node_modules/.bin/vitest', 'run', '--root', 'packages/qlever', 'test/broker-qlever.test.ts']),
]
for label, command in tasks:
    if shutil.disk_usage(root).free < 5 * 1024**3:
        raise RuntimeError('Host free disk below 5 GiB')
    before = hashes()
    runenv = env.copy()
    runenv['V_P2Q_OUT'] = str(out / label)
    if label == 'light-live':
        runenv.update(QLEVER_INTEGRATION='1', QLEVER_URL='http://127.0.0.1:7070')
    record = dict(command=command, startedAt=time.time(), sourceHashes=before,
                  head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
                  node=subprocess.check_output(['node','--version'],text=True).strip(),
                  resourceGrant='outer heavy.mjs CX-P2Q-R3-process-access-retry',
                  env={k:runenv.get(k) for k in ['V_P2Q_OUT','V_P2Q_RUNS','V_P2Q_SEEDS','QLEVER_INTEGRATION','QLEVER_URL','QLEVER_COMMIT_PATH']})
    print('START', label, flush=True)
    with (out / (label+'.log')).open('w') as log:
        record['exitCode'] = subprocess.call(command, env=runenv, stdout=log, stderr=subprocess.STDOUT)
    record.update(finishedAt=time.time(), sourceStillMatches=hashes()==before,
                  logSha256=hashlib.sha256((out/(label+'.log')).read_bytes()).hexdigest())
    (out/(label+'.json')).write_text(json.dumps(record,indent=2)+'\n')
    print('END', label, record['exitCode'], flush=True)
