#!/usr/bin/env python3
# [DX-S3] Why: derive table numbers from retained command observations and native joins. Rejected: hand-copied percentile cells.
import pathlib,json,re,statistics,hashlib
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3')
variants={}
for p in sorted(ROOT.glob('bench-*/analysis.json')):
    a=json.loads(p.read_text());assert a['analyzerSha256']==hashlib.sha256(pathlib.Path('lab/experiments/EXP-DX1/s3/analyze.py').read_bytes()).hexdigest(),'rerun current analyzer';m=re.search(r'-v([0-4])-',a['prefix'])
    if m and all(k in a['windows'] for k in ['burst-1','burst-2','burst-3','with-readers']):
        result=json.loads((p.parent/'result.json').read_text())
        reader_file=p.parent/'with-readers-readers-raw.json'
        if result.get('error') or result.get('fatalError') or result.get('steps',{}).get('withReaders',{}).get('n')!=3291 or not reader_file.exists():continue
        readers=json.loads(reader_file.read_text())
        assert len(readers)==4 and all(len(x.get('times',[]))>=8 and x['diagnostics']['faults']==0 and not x['diagnostics']['declines'] for x in readers),'reader workload capture'
        assert all(a['sourceBindingChecks'].values())
        for label in ['burst-1','burst-2','burst-3','with-readers']:
            w=a['windows'][label];c=w['checks'];assert w['latency']['n']==3291 and c['nativeMatches']==3291 and c['gatewaySamples']==3291 and c['transactSamples']==3291 and not c['nativeDatomMismatches'] and c['uniquePositions'] and c['uniqueSequences'] and c['orderedIntervals'] and c['latencyFormulasMatch'] and c['requestScopeMatches'] and not c['nativeOutsideClientInterval'],(a['prefix'],label,c)
        variants['V'+m[1]]=(a,p.parent)
def num(x):return f'{x:.2f}' if x is not None else '—'
def cell(w,field='latency'):return ' / '.join(num(w[field][k]) for k in ['p50','p90','p99','max'])
lines=[]
lines+=['Configuration comparison: no-reader cells are the worst p50 and worst p99 across the three bursts (these can be different repetitions). Counts sum the three no-reader bursts; the reader arm has 3,291 offers. These are diagnostic sampled-bar comparisons.','','| Variant | No readers, worst p50 / p99 ms | 32 readers, p50 / p99 ms | >50 ms, no readers / readers | 10 / 50 result |','| --- | ---: | ---: | ---: | --- |']
for v in ['V0','V1','V2','V3','V4']:
    if v not in variants:
        lines.append(f'| {v} | unmeasured | unmeasured | — | unknown |');continue
    a,_=variants[v];ws=[a['windows'][f'burst-{i}'] for i in [1,2,3]];r=a['windows']['with-readers']
    met=all(w['latency']['p50']<=10 and w['latency']['p99']<=50 for w in ws+[r])
    verdict=('met, lean input' if v=='V4' else 'sampled bar met') if met else 'miss'
    lines.append(f"| {v} | {max(w['latency']['p50'] for w in ws):.2f} / {max(w['latency']['p99'] for w in ws):.2f} | {r['latency']['p50']:.2f} / {r['latency']['p99']:.2f} | {sum(w['slowCount'] for w in ws)} / {r['slowCount']} | {verdict} |")
lines+=['','Every measured block follows. Serial percentiles use service time, as DX-B3 did; burst percentiles start at the scheduled offer.','','| Variant | Block | N | p50 / p90 / p99 / max ms | >50 ms |','| --- | --- | ---: | ---: | ---: |']
for v,(a,bench) in variants.items():
    for label,w in a['windows'].items():
        if label.startswith('index-'):continue
        field='service' if 'serial' in label else 'latency'
        raw=json.loads((bench/(label+'-raw.json')).read_text());over=sum(c['serviceMs' if field=='service' else 'latencyMs']>50 for c in raw)
        lines.append(f"| {v} | {label} | {len(raw)} | {cell(w,field)} | {over} |")
lines+=['','Attribution counts are nonexclusive and use the scheduled-offer-to-ACK interval. Each cell is nominal count (share of slow commands), followed by certain–possible counts across the retained host/VM clock bounds. “None” means no listed category matches. Long checkpoint overlap is not a causal assignment. Service-interval counts and all-command exposure denominators are in each analysis JSON.','','| Variant | Overlapping category | No readers | 32 readers |','| --- | --- | ---: | ---: |']
names={'transactor-pause':'Transactor GC/safepoint >10 ms','gateway-pause':'Gateway GC/safepoint >10 ms','index-job':'Transactor index job','checkpoint':'Postgres checkpoint','slow-postgres':'Postgres statement >20 ms','previous-over500':'Previous native transaction >500 datoms, overlapping offer interval','none':'None'}
for v,(a,_) in variants.items():
    ws=[a['windows'][f'burst-{i}'] for i in [1,2,3]];r=a['windows']['with-readers'];total=sum(w['slowCount'] for w in ws)
    for key,name in names.items():
        def show(items,denom):
            c=sum(w['attribution'][key]['count'] for w in items);lo=sum(w['attribution'][key]['certain'] for w in items);hi=sum(w['attribution'][key]['possible'] for w in items)
            return f'{c} ({100*c/denom:.1f}%; {lo}–{hi})' if denom else '0'
        lines.append(f'| {v} | {name} | {show(ws,total)} | {show([r],r["slowCount"])} |')
lines+=['','CPU samples are cgroup usage deltas per wall second, in cores, from nonblocking one-second probes. Native apply values are joined by native transaction t.','','| Variant | Burst | Transactor CPU mean / peak cores | Native apply p50 / p99 ms | Index jobs possibly overlapping / starting in possible burst envelope | Local nominal host→VM offsets, min–max ms |','| --- | --- | ---: | ---: | ---: | ---: |']
for v,(a,_) in variants.items():
    for label in ['burst-1','burst-2','burst-3','with-readers']:
        w=a['windows'][label];cpu=[c['cpuCores'] for c in w['cpuPerSecond']];clock=w['clockCorrection'];lo=w['nativeWindowEnvelope']['low'];hi=w['nativeWindowEnvelope']['high']
        starts=sum(lo<=e['start']<=hi for e in w['indexJobs'])
        lines.append(f"| {v} | {label} | {statistics.mean(cpu):.3f} / {max(cpu):.3f} | {w['nativeApplyMs']['p50']:.2f} / {w['nativeApplyMs']['p99']:.2f} | {len(w['indexJobs'])} / {starts} | {clock['localNominalMinMs']:.2f}–{clock['localNominalMaxMs']:.2f} |")
lines+=['','Explicit indexing probes: 100 serial commits are launched alongside each request. Completion is the fresh `sync-index` response; native overlap is checked separately.','','| Variant | Probe | completed | p50 / p90 / p99 / max ms | >50 ms | Commits overlapping native index job |','| --- | --- | --- | ---: | ---: | ---: |']
for v,(a,bench) in variants.items():
    result=json.loads((bench/'result.json').read_text())
    for label,w in a['windows'].items():
        if not label.startswith('index-'):continue
        raw=json.loads((bench/(label+'-raw.json')).read_text());cal={x['position']:x['nominalMs'] for x in w['clockCalibration']}
        overlap=sum(any(e['start']<=c['endWallMs']+cal[c['receipt']['position']] and e['end']>=c['startWallMs']+cal[c['receipt']['position']] for e in a['events'] if e['kind']=='index-job') for c in raw)
        lines.append(f"| {v} | {label} | {result['steps'][label]['response']['completed']} | {cell(w)} | {w['slowCount']} | {overlap} / {len(raw)} |")
lines+=['','Primary attempt index:','','| Variant | Stack prefix | Command and analysis directory |','| --- | --- | --- |']
for v,(a,bench) in variants.items():lines.append(f'| {v} | `{a["prefix"]}` | `{bench}` |')
(ROOT/'report-tables.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:11]))
