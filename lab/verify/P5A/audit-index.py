"""[CX-VP5A] Why: verify retained indexes and arithmetic independently; rejected: adopting stored status as fresh execution."""
import hashlib
import json
import math
import pathlib
import subprocess

root = pathlib.Path.cwd()
builder = pathlib.Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/p5a')
base = subprocess.check_output(['git', 'rev-parse', 'dadb2de'], text=True).strip()
digest = lambda b: hashlib.sha256(b).hexdigest()
summary = json.loads((root / 'lab/experiments/EXP-P5/round2-summary.json').read_bytes())
evidence = []
for file, expected in summary['evidence'].items():
    content = (builder / file).read_bytes()
    actual = digest(content)
    assert actual == expected, file
    evidence.append(dict(path=str(builder / file), bytes=len(content), sha256=actual))
receipt = json.loads((builder / 'runs/P5/r2-1k-03/receipt.json').read_bytes())
arithmetic = {}
for kind in ('burst', 'steady'):
    rounds = [r for r in receipt['traffic']['rounds'] if not r['aa'] and r['kind'] == kind]
    arithmetic[kind] = {}
    for metric in ('read', 'commit'):
        ratios = [r['sweep'][metric]['p99'] / r['baseline'][metric]['p99'] for r in rounds]
        observed = receipt['traffic']['ratios']['groups'][kind][metric]
        mean = math.exp(sum(map(math.log, ratios)) / len(ratios))
        assert math.isclose(mean, observed['geometricMean'], rel_tol=1e-14)
        assert ratios == observed['ratios']
        assert observed['status'] == 'INCONCLUSIVE'
        arithmetic[kind][metric] = dict(ratios=ratios, geometricMean=mean,
            matchedWindowsMs=[r['sweep']['matchedWindowMs'] for r in rounds],
            traceDurationsS=[r['sweep']['trace']['durationS'] for r in rounds],
            reportedCI95=observed['ci95'], reportedStatus=observed['status'])
source = {}
for file in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', base, 'lab/bench'], text=True).splitlines():
    want = subprocess.check_output(['git', 'show', f'{base}:{file}'])
    got = (root / file).read_bytes()
    assert got == want, file
    source[file] = digest(got)
kernel = {f.name: digest(f.read_bytes()) for f in (root / 'packages/w0/dist').glob('*.js')}
for entry in summary['confirmations']:
    assert entry['kernelBuild'] == kernel
report = dict(reviewedCommit=base, builderIndexedFiles=evidence, arithmetic=arithmetic,
    arithmeticLimit='Ratios and geometric means recomputed from retained p99 summaries; no fresh full raw-stream percentile/bootstrap replay claimed.',
    unmodifiedBuilderSources=source, currentKernelBuildMatchesFinalBuilderConfirmations=kernel,
    finalGuardedCounts=[dict(path=c['path'], publications=c['publications'], retries=c['retries'],
        visibleDeliveries=c['visibleDeliveries']) for c in summary['confirmations']])
(root / 'lab/verify/P5A/evidence/index-audit.json').write_text(json.dumps(report, indent=2) + '\n')
print('All 9 indexed file hashes and recorded ratio arithmetic match; builder sources unchanged.')
