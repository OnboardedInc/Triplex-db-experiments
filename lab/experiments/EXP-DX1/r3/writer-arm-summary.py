# [DX-R3-P9] Why: summarize the actual completed arm, including retries hidden by successful final outcomes.
# Rejected: pooling historical runs or counting only terminal errors.
import json, pathlib, sys, re
root = pathlib.Path(sys.argv[1]); arm = sys.argv[2]
report = json.loads((root/'driver/ns-report.json').read_text())
rows = [json.loads(line) for line in (root/'driver/ns-writes.jsonl').read_text().splitlines()]
commits = [r for r in rows if r.get('outcome') == 'committed' and r.get('transactCalledAt')]
def dist(values):
    v = sorted(values)
    return {'n': len(v), **{key: round(v[min(len(v)-1, int(p*len(v)))], 3) if v else None for key, p in [('p50', .5), ('p99', .99), ('max', 1)]}}
phases = report['phases']
first, last = report['writerSourceDiagnostics']['start'], report['writerSourceDiagnostics']['end']
def delta(field):
    return {k: v-first.get(field, {}).get(k, 0) for k, v in last.get(field, {}).items()}
gc={}
for name in ('tx','gw-w'):
    path=root/(name+'.log')
    if path.exists():
        log=path.read_text(errors='replace')
        pauses=[float(v) for v in re.findall(r'\] GC\(\d+\) Pause [^\n]*? (\d+\.\d+)ms',log)]
        gc[name]={'collector':re.findall(r'Using (Serial|G1)',log), 'pauses':dist(pauses)}
print(json.dumps({'gc':gc,'arm': arm, 'head': (root/'head.txt').read_text().strip(), 'runTag': report['runTag'],
  'scope': report['scope'], 'status': report['status'], 'strict': report['config']['strictRecordClocks'], 'readPath': report['config']['readPath'], 'expectedRowHash': report['config'].get('expectedRowHash','eager'), 'fallbackThread': report['config'].get('replicaFallbackThread','main'),
  'steady': dist([r['transactReturnedAt']-r['transactCalledAt'] for r in commits if not r.get('burst')]),
  'burst': dist([r['transactReturnedAt']-r['transactCalledAt'] for r in commits if r.get('burst')]),
  'statuses': delta('statuses'), 'sourceErrors': delta('errors'), 'adapter': {k:v for k,v in delta('counters').items() if k not in ('beginDecodeMicros','transactEncodeMicros')},
  'requests': last['requests']-first['requests'], 'requestsPerCommit': (last['requests']-first['requests'])/len(commits) if commits else None,
  'writerThread': [{'phase': p['name'], **p['writerThread']} for p in phases if 'writerThread' in p],
  'followP99Ms': report.get('replica', {}).get('acknowledgementToApplied', {}).get('p99Ms'),
  'correctness': report.get('correctness'), 'peakBytes': report.get('client', {}).get('peakProcessBytes')}))
