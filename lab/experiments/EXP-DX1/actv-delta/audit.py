"""Full independent census, publication and effect oracle for one fresh DELTA experiment process."""
import hashlib
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from oracle import projection, digest, w0, canonical
import population
worlds = {}
history = []
cache = {}
empty = {'items': [], 'pending': [], 'subjects': []}

def run(op, x):
    if op == 'population':
        r = population.Rung(x['n'])
        pos = r.K+r.L+1
        h = population.Stream(1000)
        nf = 0
        for i in range(x['n']):
            p = population.gen_placement(i,r)
            facts,pos = population.world_facts(p,pos,r)
            w0.validate_facts(p.S, facts, pos-1)
            nf += len(facts)
            h.add(population.world_json(p.S,[population.fact_json(*f) for f in facts]))
            worlds[p.S] = [dict(e=e,a=a,v=v,tx=t) for e,a,v,t in facts if a!='answers' and '/ans:' not in e]
        return {'people':len(worlds),'facts':nf,'worlds':h.finish(),'tx':pos-1,'census':digest(sorted(worlds))}
    if op == 'source':
        for w in x:
            assert w['subject'] not in worlds
            w0.validate_world(w, max([1]+[f['tx'] for f in w['facts']]))
            worlds[w['subject']] = w['facts']
        return digest([w['subject'] for w in x])
    if op == 'event':
        assert x['seq']==len(history)
        history.append(x)
        return {'seq': x['seq'], 'release':w0.Release(x['doc']).hash}
    if op == 'answers':
        n=x['seq']; ev=history[n]; basis=ev['basis']; rel=w0.Release(ev['doc']); result=[]
        for s in x['subjects']:
            facts=list(worlds[s])
            for d in history[1:n+1]:
                if d.get('subject')!=s:continue
                if 'worldAfter' in d:
                    assert d['worldAfter']['subject']==s
                    facts=list(d['worldAfter']['facts'])
                for e in d.get('edits',[]):
                    if not e['from']<=basis['validTime']<e.get('until','z'):continue
                    if not e.get('append'):facts=[f for f in facts if (f['e'],f['a'])!=(e['e'],e['a'])]
                    facts.extend(dict(e=e['e'],a=e['a'],v=v,tx=d['basis']['tx']) for v in e['values'])
            ix=w0.validate_world({'subject':s,'facts':facts},basis['tx'])
            result.append([s,digest(w0.evaluate_indexed(ix,rel,basis['tx'],basis['validTime']))])
        return result
    if op == 'read':
        result = []
        for s in x['subjects']:
            n=x['seq']
            pos, facts, state, out, rows, ds = cache.get(s,(-1,list(worlds[s]),empty,None,[],[]))
            if pos>n:
                pos,facts,state,out=-1,list(worlds[s]),empty,None
            for j in range(pos+1,n+1):
                ev=history[j];b=ev['basis'];r=w0.Release(ev['doc']);old=projection(out) if out else {}
                if ev.get('subject')==s:
                    if 'worldAfter' in ev:
                        assert ev['worldAfter']['subject']==s
                        facts=list(ev['worldAfter']['facts'])
                    for e in ev.get('edits',[]):
                        if not (e['from']<=b['validTime']<e.get('until','z')): continue
                        if not e.get('append'):facts=[f for f in facts if (f['e'],f['a'])!=(e['e'],e['a'])]
                        facts.extend(dict(e=e['e'],a=e['a'],v=v,tx=b['tx']) for v in e['values'])
                # All measurements hold valid time fixed; schedule/temporal tests exercise time travel separately.
                out=w0.evaluate_indexed(w0.validate_world({'subject':s,'facts':facts},b['tx']),r,b['tx'],b['validTime'])
                after=projection(out)
                rows=[[k,old.get(k),after.get(k)] for k in sorted(old.keys()|after.keys()) if old.get(k)!=after.get(k)]
                ds=[]
                if ev.get('subject') in (None,s):
                    published=w0.op_publish({'state':state,'evaluations':[{k:out[k] for k in ('basis','release','subject','workItems')}]})
                    state,ds=published['state'],published['deliveries']
            cache[s]=(n,facts,state,out,rows,ds)
            result.append({'subject':s,'output':digest(out),'state':digest(state),'rows':rows,'deliveries':ds})
        return result
    raise ValueError(op)

for line in sys.stdin:
    req=json.loads(line)
    print(json.dumps(run(req['op'],req['input']),separators=(',',':')),flush=True)
