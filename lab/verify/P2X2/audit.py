#!/usr/bin/env python3
"""Offline, independent reanalysis. Run from the verifier worktree root."""
import gzip
import hashlib
import json
import math
import re
import subprocess
import tarfile
from datetime import datetime
from pathlib import Path

# [CX-VP2X2] Why: read frozen bytes independently of the builder's summary/gate helpers.
# Rejected: importing analysis.mjs (would repeat the same implementation under review).
ROOT = Path.cwd()
EVIDENCE = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2')
RECEIPTS = ROOT / 'lab/experiments/EXP-P2X2/receipts'
OUT = ROOT / 'lab/verify/P2X2/recomputed.json'
BUILDER = 'b9a76c0b'
checks = 0


def check(value, message):
    global checks
    if not value:
        raise AssertionError(message)
    checks += 1


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(p):
    return json.loads(p.read_bytes())


def quantiles(values):
    check(bool(values) and all(math.isfinite(v) and v >= 0 for v in values), 'latency domain')
    a = sorted(values)
    return dict(n=len(a), p50=a[math.ceil(.5 * len(a)) - 1],
                p99=a[math.ceil(.99 * len(a)) - 1], mean=sum(a) / len(a), min=a[0], max=a[-1])


def stamp(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def metrics(raw, name):
    return {line.split()[0]: float(line.split()[1]) for line in raw.splitlines()
            if line.split() and line.split()[0].split('{')[0] == name}


def delta(b, a, name):
    x, y = metrics(b, name), metrics(a, name)
    check(bool(x) and x.keys() == y.keys(), f'metric series {name}')
    check(all(y[k] >= x[k] for k in x), f'monotone metric {name}')
    return sum(y[k] - x[k] for k in x)


manifest = ROOT / 'lab/experiments/EXP-P2X2/SHA256SUMS'
check(digest(manifest.read_bytes()) == '9733e569ecb43e2e936c96de79953179be84ff924901d516fce9fbce688a5adf',
      'published evidence manifest hash')
total = 0
indexed = {}
for line in manifest.read_text().splitlines():
    h, name = line.split('  ', 1)
    p = EVIDENCE / name
    data = p.read_bytes()
    check(digest(data) == h, f'evidence hash {name}')
    total += len(data)
    indexed[name] = h
check(len(indexed) == 338 and total == 282539738, 'manifest denominator')

all_receipts = [read(p) for p in sorted(RECEIPTS.glob('*.json'))]
selected = [r for r in all_receipts if r.get('serviceMs') and
            ((r.get('arm') in ['F1', 'F2', 'F3'] and r.get('n') in [500, 1000]) or
             (r.get('arm') in ['C', 'A0'] and r.get('n') == 150))]
check(len(selected) == 11, 'five bare segments and six service attempts')
data_by_id = {}
summaries = []
unretained_nonexecuted_helpers = set()
for r in selected:
    directory = Path(r['evidenceDir'])
    check(directory.parent == EVIDENCE and directory.name == r['id'], 'attempt namespace')
    check(digest((directory / 'manifest.json').read_bytes()) == r['manifestSha256'], 'receipt manifest')
    for item in read(directory / 'manifest.json'):
        data = (directory / item['file']).read_bytes()
        check(len(data) == item['bytes'] and digest(data) == item['sha256'], 'attempt payload')
    b, a = [read(directory / (p + '.json')) for p in ['before', 'after']]
    for observation, binding in [(b, r['binding']), (a, r['afterBinding'])]:
        check(observation['binding'] == binding, 'raw/receipt binding equality')
        check(binding['owner']['holder'] == 'CX-P2X2' and binding['owner']['mode'] == 'exclusive', 'exclusive holder')
        check(binding['container'] == '837cf4565f35f589677a339c83ee703ae7bb04767f04368143f0c64228da54e7', 'container')
        check(binding['caps'] == dict(memory=3758096384, cpus=2000000000, cpuset='4,5'), 'resource caps')
        check(binding['image'] == 'sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77', 'engine image')
        check(binding['configSha256'] == digest((ROOT / 'lab/experiments/EXP-P2X2-xtdb-commit-floor/config-root/xtdb-config.yaml').read_bytes()), 'YAML')
        for name, h in binding['files'].items():
            obj = EVIDENCE / 'source-objects' / h
            if not obj.exists():
                check(name in ['candidate.mjs', 'preload.mjs'] and r.get('phase') != 'history-10k',
                      'missing helper is not imported by this arm')
                unretained_nonexecuted_helpers.add((name, h))
            else:
                check(digest(obj.read_bytes()) == h, 'retained helper ' + name)
        check(stamp(binding['owner']['createdAt']) <= stamp(binding['startedAt']) <= stamp(binding['at']), 'observation freshness')
    check(stamp(b['binding']['at']) < stamp(a['binding']['at']), 'ordered snapshots')
    for k in ['container', 'startedAt', 'image', 'configSha256', 'owner', 'caps', 'files']:
        check(b['binding'][k] == a['binding'][k], 'stable binding ' + k)
    check(all(v == 0 for v in metrics(b['metrics'], 'compactor_jobs_available').values()) and
          bool(metrics(b['metrics'], 'compactor_jobs_available')), 'pre-arm quiet gauge')
    raw = read(directory / 'samples.json')
    check(len(raw) == r['n'] and [s['i'] for s in raw] == list(range(r['n'])), 'raw sample count/order')
    if r['arm'] in ['F1', 'F2', 'F3']:
        check(all(s['cmd'] == r['scope'] + '-' + str(i) for i, s in enumerate(raw)), 'bare command names')
        check(all(s['writes'] == {'F1': 3, 'F2': 8, 'F3': 1}[r['arm']] for s in raw), 'bare socket writes')
        used = raw
    else:
        check(r['warmupDropped'] == 15, 'service warmup')
        check(len({s['result']['txId'] for s in raw}) == 150 and
              len({s['result']['position'] for s in raw}) == 150, 'unique returned receipts')
        for i, s in enumerate(raw):
            subject = 'subj:' + r['id'] + ':' + str(i)
            check(s['subject'] == r['id'] + ':' + str(i), 'fresh subject')
            check(len(s['rows']) == 10, '10 stored facts')
            check({v['attribute'] for v in s['rows']} == {':p2x/f' + str(k) for k in range(10)}, 'exact attribute set')
            for row in s['rows']:
                k = int(row['attribute'][6:])
                check(row['entity_id'] == subject and row['value_type'] == 'string' and
                      row['value_string'] == f'v{i}-{k}', 'exact fact content')
                check(row['recorded_position'] == s['result']['position'] and
                      row['tx_id'] == s['result']['txId'], 'fact/receipt binding')
            check(s['tx']['txId'] == s['result']['txId'] and s['tx']['position'] == s['result']['position'], 'receipt readback')
            check(s['tx']['commandId'] == r['id'] + ':' + str(i), 'receipt command binding')
            check(s['explicitWaitQueries'] == 0, 'explicit wait count only')
        used = raw[15:]
    q = quantiles([s['ms'] for s in used])
    check(all(abs(q[k] - r['serviceMs'][k]) < 1e-9 for k in ['n', 'p50', 'p99', 'max', 'mean']), 'reported quantiles')
    engine = {}
    for name in ['node_tx_execute_seconds', 'node_tx_await_seconds', 'tx_op_timer_seconds']:
        sums = delta(b['metrics'], a['metrics'], name + '_sum')
        count = delta(b['metrics'], a['metrics'], name + '_count')
        engine[name] = dict(count=count, perCommitMs=1000 * sums / r['n'])
        check(abs(engine[name]['perCommitMs'] - r['engine'][name]['perCommitMs']) < 1e-8, 'engine delta')
    summaries.append(dict(id=r['id'], arm=r['arm'], latencyMs=q, engine=engine,
                          start=b['binding']['at'], end=a['binding']['at'],
                          hostLoad1=[o['host']['loadavg'][0] for o in [b, a]],
                          freeDiskBytes=[o['host']['freeDiskBytes'] for o in [b, a]],
                          residentStats=[{s['name']: s['cpuPercent'] for s in o['stats']} for o in [b, a]],
                          compactorCompleted=delta(b['metrics'], a['metrics'], 'compactor_job_timer_seconds_count')))
    data_by_id[r['id']] = raw

# [CX-VP2X2] Why: failed original accounting is supplemented with stored rows, not a boolean receipt.
# Rejected: trusting qualified:true without rechecking all rows from the independent read-back.
audits = json.loads(gzip.decompress((EVIDENCE / 'bare-independent-audit-2026-11-09T04-16-13-309Z-2002a8/observed-rows.json.gz').read_bytes()))
for v in audits:
    r = next(r for r in selected if r['id'] == v['id'])
    n, scope = r['n'], r['scope']
    expected = {scope + '-' + str(i) for i in range(n)}
    if r['arm'] == 'F1':
        check(len(v['rows']) == n and {row['_id'] for row in v['rows']} == expected, 'all F1 ids')
        check(all(int(row['v']) == int(row['_id'].rsplit('-', 1)[1]) for row in v['rows']), 'all F1 values')
        continue
    check(len(v['claims']) == n and {x['_id'] for x in v['claims']} == expected, 'all claim ids')
    check(all(x['subj'] == scope and int(x['pos']) == int(x['_id'].rsplit('-', 1)[1]) + 1 for x in v['claims']), 'all claim values')
    expected_ledger = {cmd + '|' + str(k) for cmd in expected for k in range(10)}
    check(len(v['ledger']) == 10 * n and {x['_id'] for x in v['ledger']} == expected_ledger, 'all ledger ids')
    for x in v['ledger']:
        cmd, k = x['_id'].rsplit('|', 1)
        pos = int(cmd.rsplit('-', 1)[1]) + 1
        check(x['cmd'] == cmd and x['attr'] == 'a' + k and x['val'] == f'v{pos}-{k}' and
              int(x['pos']) == pos and x['subj'] == scope, 'all ledger values')
    check(len(v['feed']) == n and {x['_id'] for x in v['feed']} == expected, 'all feed ids')
    for x in v['feed']:
        check(x['subj'] == scope and int(x['pos']) == int(x['_id'].rsplit('-', 1)[1]) + 1 and
              json.loads(x['changes']) == [dict(attr=f'a{k}', vf='now', vt='inf') for k in range(10)], 'all feed values')
    check(len(v['current']) == 1 and int(v['current'][0]['pos']) == n, 'final position')
    for k in range(10):
        actual = v['current'][0][f'a{k}']
        check((int(actual) == (n * 31 + k) % 1000003) if k < 8 else actual == f'w{n}-{k}', 'final current values')

builds = {}
for label, head in [('p2x', 'fb6681a4c5b54bfef63ad5ee670047946a24617c'),
                    ('main', '9a7996e2a242690edbc86417283d8c7348950adb'),
                    ('rt01', '1283f9fb3fe3a90448785f28d420c92a622a1991')]:
    r = next(r for r in selected if r.get('buildHead') == head)
    build = read(Path(r['evidenceDir']) / 'build.json')
    check(digest((Path(r['evidenceDir']) / 'build.json').read_bytes()) == r['buildManifestSha256'], 'build manifest receipt')
    counts = {}
    for category, archive in [('source', f'{label}-source-{head}.tar.gz'), ('dist', f'{label}-built-exports.tar.gz')]:
        files = {}
        with tarfile.open(EVIDENCE / archive, 'r:gz') as tar:
            for member in tar:
                name = member.name.removeprefix('./')
                if member.isfile() and name in build['files']:
                    files[name] = digest(tar.extractfile(member).read())
        expected_files = {f: h for f, h in build['files'].items() if ('/dist/' in f) == (category == 'dist')}
        check(files == expected_files, f'{label} {category} archive/build equality')
        if category == 'source':
            for name, h in files.items():
                committed = subprocess.check_output(['git', 'show', head + ':' + name], cwd=ROOT)
                check(digest(committed) == h, f'{label} committed source {name}')
        counts[category] = len(files)
    builds[label] = dict(head=head, **counts)
    for other in selected:
        if other.get('buildHead') == head:
            other_path = Path(other['evidenceDir']) / 'build.json'
            check(digest(other_path.read_bytes()) == other['buildManifestSha256'] and
                  read(other_path) == build, 'all service attempts use the same chosen build')

g1 = []
p2x_build = read(next(Path(r['evidenceDir']) / 'build.json' for r in selected if r.get('arm') == 'C'))
for run in ['G1-xtdb-20261109T035632Z-48b59d', 'G1-xtdb-20261109T035857Z-203df3']:
    r = read(RECEIPTS / (run + '.json'))
    directory = EVIDENCE / 'p2x/runs/G1' / run
    build_path = directory / 'build-manifest.json'
    check(digest(build_path.read_bytes()) == r['build']['manifestSha256'], 'G1 build manifest')
    declaration_drift = []
    for pkg in ['core', 'xtdb']:
        for f in read(build_path)['packages'][pkg]['list']:
            expected = p2x_build['files'][f['path']]
            if f['sha256'] != expected:
                check(run == 'G1-xtdb-20261109T035632Z-48b59d' and
                      f['path'] == 'packages/core/dist/kv/layers/KvTriplesLive.d.ts' and
                      f['sha256'] == '3325b53ab034666447eab034f059facd1dfad5515cd2b40d338994b539ba43af' and
                      expected == '1e61ae71a24c53db9e7e6456ae83a69fb5b7a9ffe3d121a82a2847c2e0ddc902',
                      'only the known nonexecutable declaration differs')
                declaration_drift.append(dict(path=f['path'], g1Sha256=f['sha256'], serviceSha256=expected))
            else:
                check(True, 'G1 exact F5 built export')
    raw = read(directory / 'g1-report.json')
    check(raw['status'] == 'PASS' and len(raw['executions']) == 88 and
          all(x['status'] == 'PASS' for x in raw['executions']), 'G1 completed executions')
    check(all(c['status'] == 'PASS' for c in r['cases']) and len(r['cases']) == 88, 'G1 cases')
    check(r['counts']['fail'] == 0 and r['counts']['skip'] == 0 and r['counts']['pass'] == 88, 'G1 denominator')
    check(r['engine']['containerId'] == selected[0]['binding']['container'], 'G1 slot continuity')
    check(stamp(r['startedAt']) < stamp(r['endedAt']) < stamp(selected[0]['binding']['at']), 'G1 before floor samples')
    g1.append(dict(runId=run, cases=88, contractVersion=r['contractVersion'], declarationDrift=declaration_drift))

pooled = {arm: quantiles([x['ms'] for r in selected if r['arm'] == arm for x in data_by_id[r['id']]]) for arm in ['F1', 'F2', 'F3']}
fresh = next(s for s in summaries if s['id'].startswith('F5-p2x-fresh-'))
trigger = dict(F3=pooled['F3']['p50'] > 6, F5=fresh['latencyMs']['p50'] > 20,
               resolve=fresh['engine']['tx_op_timer_seconds']['perCommitMs'] > 7)
check(trigger == dict(F3=True, F5=True, resolve=False), 'preregistered OR observations')
order = [r['arm'] for r in sorted(selected, key=lambda r: r['binding']['at']) if r['arm'] in ['F2', 'F3']]
check(order == ['F2', 'F3', 'F2', 'F3'], 'bare ABAB')
rule_path = Path('/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS-PENDING.md')
rule_line = next(line for line in rule_path.read_text().splitlines() if line.startswith('| Q96d '))
result = dict(review='CX-VP2X2', reviewKind='offline reanalysis, no fresh engine execution',
              reanalysisAt=datetime.now().astimezone().isoformat(), reviewerScriptSha256=digest(Path(__file__).read_bytes()),
              builderHead=subprocess.check_output(['git', 'rev-parse', BUILDER], text=True).strip(),
              evidenceManifestSha256=digest(manifest.read_bytes()), indexedFiles=len(indexed), indexedBytes=total,
              Q96d=dict(path=str(rule_path), sha256=digest(rule_path.read_bytes()), text=rule_line),
              checkedAssertions=checks, builds=builds, pooled=pooled, attempts=summaries,
              historicalG1=g1,
              unretainedNonexecutedHelpers=sorted(unretained_nonexecuted_helpers),
              decisionThresholdsTriggered=trigger,
              mechanicalDecision='D1' if any(trigger.values()) else 'D2')
OUT.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(checks=checks, indexedFiles=len(indexed), indexedBytes=total, pooled=pooled,
                      F5fresh=fresh['latencyMs'], mechanicalDecision=result['mechanicalDecision']), indent=2))
