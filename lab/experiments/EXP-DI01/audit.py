"""Builder-only readback audit. Run through heavy.mjs after the completed attempts exist."""
import datetime
import hashlib
import json
import pathlib
import re
import sqlite3
import subprocess
import uuid

REPO = pathlib.Path.cwd()
ROOT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01')
SELF = pathlib.Path(__file__).resolve()
sha = lambda b: hashlib.sha256(b).hexdigest()
canon = lambda v: json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
load = lambda p: json.loads(pathlib.Path(p).read_text())
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
self_hash = sha(SELF.read_bytes())
AUDIT = ROOT / ('audit-' + str(uuid.uuid4()))
AUDIT.mkdir()

# [EXP-DI01] Why: a completed bound receipt is required before raw readback. Rejected: adopting a diagnostic MATCH or a partial prefix.
def bound(relative):
    result = load(ROOT / relative / 'result.json')
    assert result['status'] == 'MATCH'
    binding = result['binding']
    assert binding and sha(pathlib.Path(binding['path']).read_bytes()) == binding['sha256']
    manifest = load(binding['path'])
    for item in manifest['files']:
        preimage = pathlib.Path(binding['path']).parent / 'preimages' / item['sha256']
        assert len(preimage.read_bytes()) == item['bytes']
        assert sha(preimage.read_bytes()) == item['sha256'], item['path']
    return result, {f['path']: f['sha256'] for f in manifest['files']}

cases, case_binding = bound('final-r4/cases')
crash, crash_binding = bound('final-r4/crash')
lag, lag_binding = bound('final-r8/lag')
trace, trace_binding = bound('final-r12/trace')
runtime_prefixes = ('packages/host/', 'packages/core/', 'packages/testkit/', 'packages/w0/', 'lab/oracles/domain/', 'lab/world/W0/')
for binding in [case_binding, crash_binding, lag_binding]:
    for path, digest in trace_binding.items():
        if path.startswith(runtime_prefixes) or path in ['pnpm-lock.yaml', 'lab/bench/lib/w0-world.ts', 'lab/bench/lib/di01-refs.ts']:
            assert binding[path] == digest, path
for path, digest in trace_binding.items():
    assert sha((REPO / path).read_bytes()) == digest, ('current final trace source moved', path)

g0 = load(ROOT / 'g0/G0-datomic-20261109T071437Z-c6e724/receipt.json')
assert g0['verdict'] == 'PASS' and g0['slot'] is None
assert g0['counts']['fail'] == 0 and g0['counts']['unexpectedSkip'] == 0
assert g0['counts']['pass'] == 1275 and g0['counts']['expectedSkip'] == 66
for row in g0['objects']:
    if row.get('path') in trace_binding and row.get('role') in ['modified-input', 'untracked-input']:
        assert row['sha256'] == trace_binding[row['path']]
assert len(cases['cases']) == 9 and cases['notApplicable'] == ['C67', 'C96']
# [EXP-DI01] Why: verify the fresh GS and oracle-transport controls by their observed/expected bytes. Rejected: assigning gate four from the fanout count alone.
lo = pathlib.Path(trace['binding']['path']).stat().st_mtime
hi = datetime.datetime.fromisoformat(trace['started'].replace('Z', '+00:00')).timestamp()
def fresh_control(pattern):
    files = [p for p in ROOT.glob(pattern) if lo <= p.stat().st_mtime <= hi]
    assert len(files) == 1, (pattern, files)
    return files[0], load(files[0])
gs_path, gs = fresh_control('GS06-*/result.json')
assert gs['status'] == 'MATCH' and gs['affected'] == ['pl:a']
checks = {c['id']: c for c in gs['checks']}
for c in gs['checks']:
    assert c['observed'] == c['expected'] and c['attempt'] == gs['attempt']
    assert c['sourceSha256'] == gs['sourceSha256'] and c['endpoint'].startswith('memory://DI01-GS06-')
assert json.loads(checks['GS-06:affected-subjects']['observed']) == {'affected': ['pl:a']}
record = json.loads(checks['GS-06:durable-affected-checkpoint']['observed'])
assert record['affected'] == record['rerun'] == ['pl:a'] and record['checkpoint'] == record['position']
assert 'GS-06:rerun-exactly-once' in checks
control_path, control = fresh_control('oracle-control-*/result.json')
assert control['status'] == 'MATCH' and len(control['rows']) == 11
for row in control['rows']:
    fixture = REPO / 'lab/world/W0/cases' / row['name']
    assert sha(fixture.read_bytes()) == row['sha256']
    assert row['observed'] == row['expected'] == load(fixture)['expected']

for case in cases['cases']:
    fixture = REPO / 'lab/world/W0/cases' / case['name']
    assert sha(fixture.read_bytes()) == case['sha256']
    assert case['observed'] == case['expected'] == load(fixture)['expected']['affected']

# [EXP-DI01] Why: read the final SQLite bytes independently of the emitted recovery counters. Rejected: trusting passed:true, an exit code, or a post-replay count alone.
def snapshot(file):
    db = sqlite3.connect(f'file:{file}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    get = lambda sql: [dict(r) for r in db.execute(sql, ('c',))]
    effects = get('SELECT epoch,position,subject FROM effects WHERE consumer=? ORDER BY epoch,position,subject')
    affected = get('SELECT epoch,position,subject FROM affected WHERE consumer=? ORDER BY epoch,position,subject')
    checkpoint = get('SELECT source,token FROM checkpoints WHERE consumer=?')
    deps = {}
    for table, order in [('di_ref', 'entity,attribute,value'), ('di_release', 'consumer'), ('di_boundary', 'subject,at,kind'), ('di_basis', 'subject'), ('di_config', 'consumer')]:
        deps[table] = get(f'SELECT * FROM {table} WHERE consumer=? ORDER BY {order}')
    db.close()
    return dict(effects=effects, affected=affected, checkpoint=checkpoint[0] if checkpoint else None, dependencies=deps)

crash_dir = ROOT / 'final-r4/crash'
assert snapshot(crash_dir / 'baseline.db') == crash['after']
counts = {'keyed-atomic': 0, 'unkeyed-split': 0, 'keyed-split': 0}
methods = {key: set() for key in counts}
duplicates = 0
for line in (crash_dir / 'observations.jsonl').open():
    row = json.loads(line)
    arm, point, attempt = row['arm'], row['point'], row['attempt']
    assert row['exit'] == 77 and row['trace']['arm'] == arm and row['trace']['point'] == point
    assert row['trace']['inputSha256'] == sha((crash_dir / 'input.json').read_bytes())
    target = crash['after'] if point in ['after-commit', 'after-checkpoint'] else crash['before']
    if arm == 'keyed-atomic':
        assert row['beforeReplay'] == target
    elif arm == 'keyed-split':
        assert row['beforeReplay'] != target
    file = crash_dir / f'{arm}-{point}-{attempt}.db'
    assert snapshot(file) == crash['after'], file
    if arm == 'unkeyed-split':
        db = sqlite3.connect(f'file:{file}?mode=ro', uri=True)
        n = db.execute('SELECT count(*) FROM unkeyed_effects').fetchone()[0] - len(crash['after']['effects'])
        db.close()
        assert n == row['duplicateEffects']
        duplicates += n
    counts[arm] += 1
    methods[arm].add(row['trace']['methodSha256'])
assert counts == {'keyed-atomic': 500, 'unkeyed-split': 300, 'keyed-split': 100}
assert duplicates == 100 and all(len(v) == 1 for v in methods.values())
assert len(set.union(*methods.values())) == 3

# [EXP-DI01] Why: derive the logical denominator and command hash from the frozen generators, not the trace's success flag. Rejected: treating a long completed prefix as the full rung.
meta_script = AUDIT / 'meta.mts'
meta_script.write_text('''
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {seedCommands} from REPO_SEED;
import {generateTrace,traceDigest} from REPO_TRACE;
import {mapW0Trace} from REPO_MAPPER;
import {W0,canonical} from REPO_WORLD;
const result=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),R=W0.rung(10000),ranges:any[]=[],fullCounts:any={},seen=new Set<string>(),hash=createHash('sha256');let position=0;
const owner=(e:string)=>W0.classify(e)?.owner??'';
const append=(rows:any[],validFrom:number,retract:any[]=[])=>{position++;hash.update(canonical({position,rows,validFrom,retract})+'\\n');for(const [e]of rows)if(W0.isPlacementId(e))seen.add(e);const subjects=[...new Set([...rows,...retract].map(([e])=>owner(e)).filter(Boolean))].sort();const last=ranges.at(-1);if(last&&JSON.stringify(last.subjects)===JSON.stringify(subjects))last.through=position;else ranges.push({from:position,through:position,subjects});if(position%1000===0)fullCounts[position]=seen.size;};
for(const c of seedCommands(10000)){append(c.rows,c.validFrom);if(position!==c.position)throw Error('seed gap');}
const seedEnd=position;if(seedEnd!==W0.populationBasis(R).tx)throw Error('seed basis mismatch');
const events=generateTrace({seed:result.trace.seed,subjects:result.trace.subjects,durationS:result.trace.durationS}),overlayPositions:any={};let e=0,o=0;
for(const event of events){if(event.resend)continue;const mapped=mapW0Trace(event);append(mapped.rows,mapped.validFrom);e++;if(o<result.overlaySchedule.length&&e>=result.overlaySchedule[o].atEvent){const r=result.overlaySchedule[o++];append(r.rows,Date.parse(W0.POPULATION_VALID_TIME),r.retract??[]);overlayPositions[position]=r.label;}}
while(o<result.overlaySchedule.length){const r=result.overlaySchedule[o++];append(r.rows,Date.parse(W0.POPULATION_VALID_TIME),r.retract??[]);overlayPositions[position]=r.label;}
console.log(JSON.stringify({seedEnd,positions:position,subjects:seen.size,initialShared:R.K+R.L,fullCounts,ranges,overlayPositions,traceDigest:traceDigest(events),commandLogSha256:hash.digest('hex'),raises:[...seen].filter(s=>W0.plan(R,Number(s.slice(4))).raise).sort()}));
'''.replace('REPO_SEED', json.dumps((REPO / 'lab/bench/lib/w0-seed.ts').as_uri())).replace('REPO_TRACE', json.dumps((REPO / 'lab/bench/lib/trace.ts').as_uri())).replace('REPO_MAPPER', json.dumps((REPO / 'lab/bench/lib/w0-trace.ts').as_uri())).replace('REPO_WORLD', json.dumps((REPO / 'lab/bench/lib/w0-world.ts').as_uri())))
meta = json.loads(subprocess.check_output([str(REPO / 'node_modules/.bin/tsx'), str(meta_script), str(ROOT / 'final-r12/trace/result.json')], text=True))
(AUDIT / 'meta.json').write_text(json.dumps(meta, separators=(',', ':')) + '\n')
assert meta['subjects'] == 10000 == trace['traceResult']['subjects']
assert meta['seedEnd'] == trace['traceResult']['seedEnd']
assert meta['positions'] == trace['traceResult']['positions']
assert meta['traceDigest'] == trace['traceSha256']
assert meta['commandLogSha256'] == trace['traceResult']['commandLogSha256']
assert trace['traceResult']['crosscheckPositions'] == 101
assert sha(canon({'seed': trace['overlaySeed'], 'schedule': trace['overlaySchedule']}).encode()) == trace['overlaySha256']

trace_dir = ROOT / 'final-r12/trace'
# [EXP-DI01] Why: the optimization must preserve actual input/result bytes, not just affected-set cardinality. Rejected: claiming an earlier partial attempt as a complete gate.
old_dir = ROOT / 'final-r9/trace'
old_path = old_dir / 'checks.jsonl'
if old_path.exists():
    with old_path.open() as old, (trace_dir / 'checks.jsonl').open() as new:
        for _ in range(10000): assert next(old) == next(new)
else:
    # [EXP-DI01] Why: compare actual losslessly retained bytes and verify the whole original hash. Rejected: dropping the prefix control because its plain file was archived.
    expected_hash = dict((line.split()[1], line.split()[0]) for line in (old_dir / 'ORIGINAL-SHA256SUMS.txt').read_text().splitlines())['checks.jsonl']
    child = subprocess.Popen(['/opt/homebrew/bin/zstd', '-dc', str(old_path) + '.zst'], stdout=subprocess.PIPE)
    observed_hash = hashlib.sha256()
    with (trace_dir / 'checks.jsonl').open('rb') as new:
        count = 0
        for line in child.stdout:
            observed_hash.update(line)
            if count < 10000: assert line == next(new)
            count += 1
    assert count >= 10000 and child.wait() == 0 and observed_hash.hexdigest() == expected_hash

db = sqlite3.connect(f'file:{trace_dir / "trace.db"}?mode=ro', uri=True)
assert db.execute('SELECT source,token FROM checkpoints WHERE consumer=?', ('c',)).fetchone() == ('DI01/offline/replay', str(meta['positions']))
assert db.execute('SELECT count(*) FROM deliveries WHERE consumer=?', ('c',)).fetchone()[0] == meta['positions']
for left, right in [('affected', 'effects'), ('effects', 'affected')]:
    assert db.execute(f'SELECT count(*) FROM (SELECT * FROM {left} EXCEPT SELECT * FROM {right})').fetchone()[0] == 0
rows = iter(db.execute('SELECT position,subject FROM affected WHERE consumer=? ORDER BY CAST(position AS INTEGER),subject', ('c',)))
next_row = next(rows, None)
groups = iter((trace_dir / 'oracle.jsonl').open())
workers = [iter((trace_dir / f'oracle-worker-{i}.jsonl').open()) for i in range(3)]
worker_ordinals = [0, 0, 0]
pending = {}
range_index = 0
position = different = full = 0
activation = next(int(p) for p, label in meta['overlayPositions'].items() if label == 'activation')
for line in (trace_dir / 'checks.jsonl').open():
    check = json.loads(line); position += 1
    assert check['position'] == position == check['oracleRequestId']
    while position not in pending:
        group = json.loads(next(groups)); assert group['requestId'] not in pending
        pending[group['requestId']] = group
        assert len(pending) <= 200
    group = pending.pop(position)
    assert group['basis']['tx'] == position - 1
    assert group['basis']['validTime'] == '2026-12-01T00:00:00.000000Z'
    assert group['release'] == ('R1' if position <= activation else 'R2')
    assert group['requests'] == check['oracleRequests']
    assert sum(r['worlds'] for r in group['requests']) == group['worlds'] == check['worlds']
    aggregate = []
    for ref in group['requests']:
        w = ref['worker']; worker_ordinals[w] += 1
        assert ref['ordinal'] == worker_ordinals[w] and re.fullmatch('[a-f0-9]{64}', ref['inputSha256'])
        observed = json.loads(next(workers[w])); assert 'error' not in observed
        assert observed['affected'] == sorted(set(observed['affected']))
        aggregate.extend(observed['affected'])
    aggregate.sort(); assert len(set(aggregate)) == len(aggregate)
    assert aggregate == group['result']['affected'] == check['expected'] == check['observed']
    stored = []
    while next_row and int(next_row[0]) == position:
        stored.append(next_row[1]); next_row = next(rows, None)
    assert not next_row or int(next_row[0]) > position
    assert stored == check['observed']
    while meta['ranges'][range_index]['through'] < position: range_index += 1
    diff = meta['ranges'][range_index]['subjects'] != aggregate
    assert diff == check['differsFromDirect']; different += diff
    is_full = position <= meta['initialShared'] or position % 1000 == 0 or str(position) in meta['overlayPositions']
    assert is_full == check['full']; full += is_full
    assert check['worlds'] == (meta['fullCounts'].get(str(position), 10000 if position > meta['seedEnd'] else 0) if is_full else 1)
assert position == meta['positions'] and not pending and next(groups, None) is None and next_row is None
assert all(next(w, None) is None for w in workers)
assert different > 0 and different == trace['traceResult']['differentFromDirect']
assert full == trace['traceResult']['fullWorldPositions']
r2 = next(o['rows'][0][2] for o in trace['overlay'] if o['label'] == 'activation')
assert db.execute('SELECT release FROM di_release WHERE consumer=?', ('c',)).fetchone()[0] == r2
db.close()

edge = sqlite3.connect(f'file:{trace_dir / "fact-edges.db"}?mode=ro', uri=True)
raise_at = int(datetime.datetime(2026, 11, 16, tzinfo=datetime.timezone.utc).timestamp() * 1000)
raise_subjects = [r[0] for r in edge.execute('SELECT DISTINCT subject FROM di_boundary WHERE consumer=? AND at=? ORDER BY subject', ('c', raise_at))]
assert raise_subjects == meta['raises'] and len(raise_subjects) == trace['factEdges']['expected'] == trace['factEdges']['observed']
assert sha(canon(raise_subjects).encode()) == trace['factEdges']['sha256']
edge.close()
for boundary in cases['boundaries']:
    subject = load(REPO / boundary['file'])['input']['world']['subject']
    expected = [dict(subject=subject, at=int(datetime.datetime.fromisoformat(o['boundary'].replace('Z', '+00:00')).timestamp()*1000), kind='rule:'+o['kind']+':'+o['id']) for o in boundary['obligations'] if o['boundary'] <= '2027-01-16T00:00:00.000000Z']
    assert sorted(boundary['due'], key=canon) == sorted(expected, key=canon)

lag_dir = ROOT / 'final-r8/lag'
samples = {r['label']: [] for r in lag['results']}
repoints = []
for line in (lag_dir / 'samples.jsonl').open():
    r = json.loads(line); samples[r['label']].append(r)
    assert r['order'] == ('di-fd' if r['i'] % 2 else 'fd-di')
    expected = r['diWithoutRead']-r['fd'] if r['label']=='repoint' else r['di']-r['fd']
    assert abs(expected-r['added']) < 1e-8
    assert abs(r['di']-r['apply']-r['preparation']) < 1e-8
    if r['label']=='repoint': repoints.append(r['value'])
assert repoints == ['jur:j002' if i%2==0 else 'jur:j001' for i in range(1000)]
reruns = {k: [] for k in samples}
for line in (lag_dir / 'reruns.jsonl').open():
    r = json.loads(line); assert re.fullmatch('[a-f0-9]{64}', r['outputSha256']); reruns[r['label']].append(r['subject'])
raw_oracle = [json.loads(line) for line in (lag_dir / 'oracle.jsonl').open()]
assert len(raw_oracle) == 4
for arm, oracle in zip(lag['results'], raw_oracle):
    values = samples[arm['label']]; assert len(values) == 1000
    for raw_key, result_key in [('di','diP99'), ('fd','fdP99'), ('added','addedP99'), ('read','pinnedReadP99')]:
        assert sorted(r[raw_key] for r in values)[989] == arm[result_key]
    assert arm['addedP99'] <= 20 and arm['predictionMet']
    assert reruns[arm['label']] == oracle['affected'] and len(reruns[arm['label']]) == arm['fanout'] == arm['rerunOnce']
    assert sha(canon(oracle['affected']).encode()) == arm['affectedSha256']
assert lag['crosscheckSubjects'] == lag['worlds'] == 100000
assert self_hash == sha(SELF.read_bytes())
result = dict(kind='builder-only-content-readback', independentPromotion=False, status='PASS', started=started, finished=datetime.datetime.now(datetime.timezone.utc).isoformat(), auditSourceSha256=self_hash, auditAttempt=str(AUDIT), gates=8, gsEvidence=str(gs_path), oracleControl=str(control_path), tracePositions=position, differentFromDirect=different, fullWorldPositions=full, oracleWorkerRequests=worker_ordinals, crashReadbacks=counts, controlDuplicateEffects=duplicates, raises=len(raise_subjects), lag=[dict(label=a['label'],fanout=a['fanout'],addedP99=a['addedP99']) for a in lag['results']])
(AUDIT / 'result.json').write_text(json.dumps(result, indent=2)+'\n')
(ROOT / 'BUILDER-CHECKS.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
