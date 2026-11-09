"""A01-040-R2: F1 reproduction. Compares each O-CONTRACT runner file's declared hash with its actual bytes at a given commit (default: working tree HEAD).
Why: --verify reproduced the stale pin; only a byte comparison of the runner files exposes it. Rejected: comparing artifacts.oracle-contract.json (always correct)."""
import hashlib, json, subprocess, sys
rev = sys.argv[1]
git = lambda *a: subprocess.check_output(['git', *a], cwd=sys.argv[2])
doc = json.loads(git('show', rev + ':lab/acceptance/obligations.json'))
runner = doc['oracleRunners']['O-CONTRACT']
bad = 0
for path in runner['files']:
    actual = hashlib.sha256(git('show', rev + ':' + path)).hexdigest()
    ok = actual == runner['sha256'][path]
    bad += not ok
    print(json.dumps({'rev': rev, 'path': path, 'declared': runner['sha256'][path], 'actual': actual, 'matches': ok}))
sys.exit(1 if bad else 0)
