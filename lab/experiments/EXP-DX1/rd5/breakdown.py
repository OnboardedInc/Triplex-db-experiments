# [DX-RD5] Per-window means of the sampled /read exchanges (io-stats, handler CPU, spans) and the reader's GC pauses
# and freed MB over each window, from the unpacked server archives of 2026-11-23:
#   python3 breakdown.py DIR   (DIR holds e02/ p6/ p12/ unpacked from evidence/DX-SCALE1/pinned-saves-1b-e02 and random-1b-d94)
import json,sys,collections,statistics as st
def run(summary, trace, label):
    j=json.load(open(summary)); idmap={}
    for w in j['windows']:
        r=w.get('reads') or {}
        for i in (r.get('profiled') or {}).get('ids',[]): idmap[i]=w['name']
    agg=collections.defaultdict(lambda: collections.defaultdict(list))
    for l in open(trace):
        r=json.loads(l)
        if r.get('name')!='gateway /v1/db/{db}/read': continue
        w=idmap.get(r.get('readProfileId'))
        if not w: continue
        a=r['attributes']; io=(a.get('peerIoStats') or {}).get('reads',{})
        sp={s['name']:0.0 for s in r['spans']}
        for s in r['spans']: sp[s['name']]+= s['end']-s['start']
        g=agg[w]
        g['handlerCpu'].append(a.get('handlerCpuNs',0)/1e6)
        for k in ['sql','sql-ms','deserialize','deserialize-ms','eavt-load','avet-load','aevt-load','ocache','dir','eavt','avet','aevt']:
            g[k].append(io.get(k,0))
        g['rowTexts'].append(r['counters'].get('rowTexts',0))
        g['admitted'].append(sp.get('gateway.admitted-work',0)); g['wait'].append(sp.get('gateway.admission-wait',0))
        g['peerEntity'].append(sp.get('read.peer-entity',0)); g['rowDecode'].append(sp.get('read.row-decode',0))
        g['selectDb'].append(sp.get('read.select-db',0)+sp.get('read.resolve-position',0))
        g['json'].append(sp.get('gateway.json-encode',0)); g['bytes'].append(a.get('responseBytes',0))
    for w,g in agg.items():
        n=len(g['handlerCpu'])
        print(label, w, 'n=%d'%n, ' '.join('%s=%.2f'%(k, st.mean(v)) for k,v in g.items()))
base=sys.argv[1]
run(base+'/e02/saves/pinned-saves/pinned-saves.json', base+'/e02/saves/pinned-saves/engines/tx2-dxscale1-v01-68d591cb-6bf/trace/raw/gw-r.jsonl','e02')
run(base+'/p6/triplex-pinned-random-1b/p6/pinned-saves/pinned-saves.json', base+'/p6/triplex-pinned-random-1b/p6/pinned-saves/engines/tx2-dxscale1-v01-c989aac4-236/trace/raw/gw-r.jsonl','p6')
run(base+'/p12/triplex-pinned-random-1b-p12/p12/pinned-saves/pinned-saves.json', base+'/p12/triplex-pinned-random-1b-p12/p12/pinned-saves/engines/tx2-dxscale1-v01-49bed6c9-855/trace/raw/gw-r.jsonl','p12')

import re,datetime
def gc(armdir, log, label):
    pauses=[]
    for l in open(log):
        m=re.match(r'\[(\S+)\]\[\d+ms\]\[info\]\[gc\s*\] GC\(\d+\) Pause (Young|Remark|Cleanup|Full)\S* .*?(\d+)M->(\d+)M\(\d+M\) ([\d.]+)ms',l)
        if m:
            t=datetime.datetime.strptime(m.group(1),'%Y-%m-%dT%H:%M:%S.%f%z').timestamp()*1000
            pauses.append((t,float(m.group(5)),int(m.group(3))-int(m.group(4))))
    for w in ['ref-random-near-head','s-random-near-head','ref-random-seed-cut','ref-near-head','ref-seed-cut']:
        try: a=json.load(open(f'{armdir}/{w}/arm.json'))['start']
        except Exception: continue
        ps=[p for p in pauses if a<=p[0]<a+90000]
        print(label,w,'pauses',len(ps),'pause-share %.3f freedMB %d'%(sum(p[1] for p in ps)/90000, sum(p[2] for p in ps)))
gc(base+'/e02/saves/pinned-saves', base+'/e02/saves/pinned-saves/engines/tx2-dxscale1-v01-68d591cb-6bf/trace/raw/rd1-gc.log','e02')
gc(base+'/p12/triplex-pinned-random-1b-p12/p12/pinned-saves', base+'/p12/triplex-pinned-random-1b-p12/p12/pinned-saves/engines/tx2-dxscale1-v01-49bed6c9-855/trace/raw/rd1-gc.log','p12')
