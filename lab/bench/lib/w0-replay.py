"""EXP-P5-R3: incremental bridge to accepted O-REPLAY; command intent and receipt identities only."""
import sys, json, hashlib
from collections import OrderedDict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from lab.oracles.replay import replay as R, values as V, views as W
engine = R.Engine(default_scope='p5', lane='xtdb')
state = engine.scope('p5')
index = 0
route_cache = OrderedDict()
refs = {'documents', 'decisions', 'answers', 'next', 'location', 'jurisdiction'}
def plain(v):
    return json.loads(V.dumps(v))
def append(c):
    global index
    rec = c['receipt']
    ops = c['operations']
    command = {'operations': ops, 'meta': c.get('meta') or {}, '_index': index}
    instant = V.Num.parse(rec['instant'])
    plan = engine.plan(state, command, instant)
    ids = iter(t['id'] for t in rec['triples'])
    bound = [next(ids) if op.get('op') == 'assert' else None for op in ops]
    if int(rec['position']) <= state.last_position:
        raise ValueError('receipt position not increasing')
    engine.apply(state, command, plan, {'position':int(rec['position']), 'instant':instant, 'txId':rec['txId'], 'assertionIds':bound})
    index += 1

def answer(request):
    op, data = request['op'], request['input']
    if op == 'append':
        for command in data: append(command)
        return {'position':state.last_position}
    if op == 'route':
        key=hashlib.sha256(V.dumps(data['history']).encode()).hexdigest()
        if key not in route_cache:
            e=R.Engine(default_scope='route',lane='xtdb',adapter={'schemaVersion':1})
            st=e.scope('route'); templates={}
            for number,commit in enumerate(data['history']['commits']):
                ops=[]; ids=[]; staged={}
                instant=V.Num.parse(commit['instant'])
                for w in commit['writes']:
                    if w['op']=='retract':
                        target=w['id']
                        if target in st.assertions: ops.append({'op':'retract','id':target})
                        else:
                            # [EXP-P5-R3] Why: O-REPLAY models staged retirement through patterns; prove a unique target. Rejected: altering oracle semantics to support staged IDs.
                            t=staged[target]; pattern={k:t[k] for k in ['entityId','attribute','value']}
                            decoded=e._decode_pattern(st,pattern)
                            matches=sum(e._matches(R._fields_of(a),decoded) for a in st.live())+sum(e._matches(e._plan_assert(a,{},instant),decoded) for a in staged.values())
                            if matches!=1: raise ValueError('ambiguous staged retirement translation')
                            ops.append({'op':'retract-pattern','pattern':pattern})
                        ids.append(None);continue
                    row=w['row'];templates[row['id']]=row
                    typ=row['value_type']; col={'integer':'value_string','ref':'value_string','string':'value_string','number':'value_number','boolean':'value_boolean','json':'value_json','datetime':'value_datetime'}[typ]
                    value=row[col]
                    if typ=='boolean': value=bool(int(value))
                    if typ=='json': value=V.loads(value)
                    item={'op':'assert','entityId':row['entity_id'],'attribute':row['attribute'],'value':V.Obj([('type',typ),('value',value)]),'validFrom':row['valid_from'],'createdBy':row['created_by'],'entityType':row['entity_type']}
                    if row['valid_to'] is not None: item['validTo']=row['valid_to']
                    staged[row['id']]=item;ops.append(item);ids.append(row['id'])
                instant=V.Num.parse(commit['instant']);command={'operations':ops,'_index':number}
                plan=e.plan(st,command,instant)
                e.apply(st,command,plan,{'position':int(commit['position']),'instant':instant,'txId':'tx:'+str(commit['position']),'assertionIds':ids})
            route_cache[key]=(e,st,templates)
            if len(route_cache)>4: route_cache.popitem(last=False)
        e,st,templates=route_cache[key]
        req=data['request']; b=req['basis']; P=int(b.get('recordedPosition',st.last_position))
        if P>st.last_position: return {'refusal':'BasisNotAvailable'}
        time=V.Num.parse(b['recordedAt']).frac if 'recordedAt' in b else None
        valid=V.Num.parse(b.get('validAt',data['history']['now'])).frac
        cut=W.Cut('route',P,time,valid); result=[]
        for a in st.assertions.values():
            if req.get('entityId',a.entityId)!=a.entityId: continue
            if not W.known(a.recordedPosition,a.recordedAt,cut): continue
            if not req.get('history') and not W.visible(a,cut): continue
            x=plain(R.assertion_output(a,mask=(P,time) if data['contract']=='snapshot' else None))
            row=plain(templates[a.id]); value=x['value']; typ=value['type']
            for col in ['value_string','value_number','value_boolean','value_json','value_datetime']: row[col]=None
            col={'integer':'value_string','ref':'value_string','string':'value_string','number':'value_number','boolean':'value_boolean','json':'value_json','datetime':'value_datetime'}[typ]
            row[col]=int(value['value']) if typ=='boolean' else json.dumps(value['value'],separators=(',',':')) if typ=='json' else value['value']
            row.update(entity_id=x['entityId'],attribute=x['attribute'],value_type=typ,recorded_at=x['recordedAt'],recorded_position=x['recordedPosition'],valid_from=x['validFrom'],valid_to=x['validTo'],retracted_at=x['retractedAt'],retracted_position=x['retractedPosition'],retract_tx_id=x['retractTxId'])
            result.append(row)
        return result
    if op == 'counts':
        return {'position':state.last_position, 'assertions':len(state.assertions), 'retired':sum(a.retractedPosition is not None for a in state.assertions.values()), 'frames':len(state.records)}
    if op == 'world':
        P, valid = int(data['basis']['position']), V.Num.parse(data['basis']['validAt']).frac
        if P > state.last_position: raise ValueError('replay missing receipt')
        cut = W.Cut('p5', P, None, valid)
        visible = [a for a in state.assertions.values() if W.visible(a,cut)]
        seen = {data['subject']}; facts=[]
        while seen:
            entity = min(seen);seen.remove(entity)
            if entity in done: continue
            done.add(entity)
            for a in visible:
                if a.entityId != entity: continue
                value = plain(R.read_value(a).to_output())
                v=value['value']
                if value['type']=='integer': v=int(v)
                facts.append({'e':a.entityId,'a':a.attribute,'v':v,'tx':a.recordedPosition})
                if a.attribute in refs and value['type']=='ref' and v not in done: seen.add(v)
        # [EXP-P5-R3] Why: SPEC 9 orders UTF-8 canonical facts. Rejected: preserving engine iteration order (not canonical world bytes).
        facts.sort(key=lambda f: json.dumps(f,ensure_ascii=False,separators=(',',':'),sort_keys=True).encode())
        return {'subject':data['subject'],'facts':facts}
    raise ValueError('unknown replay operation')
for line in sys.stdin:
    try:
        done=set()
        print(json.dumps(answer(V.loads(line)),ensure_ascii=False,separators=(',',':')),flush=True)
    except Exception as error:
        print(str(error),file=sys.stderr,flush=True);sys.exit(1)
