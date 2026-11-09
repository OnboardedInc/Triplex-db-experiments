# [EXP-OBS01] Why: protocol fields are derived from parsed vendor/kernel/wire facts, never a record-object pass-through.
# Rejected: copying requested engine fields from a case JSON. Missing source mechanisms refuse explicitly.
from decimal import Decimal

PROTOCOLS={'NO-MUTATION','PREABORT','CONNECTIONS','SCRATCH','RESOURCE','AVAILABILITY','SCALE-COUNT','WORK','MAINTENANCE','ERASURE-SCAN','CANCEL','WATERMARK','ACK-ORDER','FAULT-TRANSITIONS'}

def protocol_window(parsed,spec):
    anchor=parsed['samples'][0].get('runStartedMono')
    if anchor is None:raise ValueError('run anchor missing')
    lo=anchor+spec['window']['offsetMs'];hi=lo+spec['window']['durationMs']
    samples=parsed['samples']
    if not samples[0]['tStartMono']<=lo<hi<=samples[-1]['tEndMono']:raise ValueError('source does not cover evaluator window')
    return lo,hi

def metric_counter(sample,metric):
    rows=[m for m in sample['metrics'] if m['name']==metric]
    if metric.startswith('qlever_'):rows=[r for r in rows if 'operation="update"' in r['labels']]
    if not rows:raise ValueError('required mutation gauge/counter absent')
    result={}
    for row in rows:
        value=Decimal(row['value'])
        if not value.is_finite() or value!=value.to_integral_value():raise ValueError('invalid exact counter')
        if row['labels'] in result:raise ValueError('duplicate counter series')
        result[row['labels']]=int(value)
    return result

def protocol_normalize(data,spec,source_id):
    if 'protocols' in spec:
        combined={}
        for item in spec['protocols']:
            for key,value in protocol_normalize(data,item,source_id).items():
                if key in combined and combined[key]!=value:raise ValueError('contradictory protocol fields')
                combined[key]=value
        return combined
    parsed=normalize(data);protocol=spec['protocol'].removeprefix('OBS-');root=source_id.split('.')[0]
    if protocol not in PROTOCOLS:raise ValueError('unknown protocol')
    if protocol in EXTRA_PROTOCOLS:
        return derive_extra(parsed,spec,root)[0]
    lo,hi=protocol_window(parsed,spec)
    if protocol=='NO-MUTATION':
        if root in ('X1','Q1'):
            metric='node_tx_latestCompletedTxId' if root=='X1' else 'qlever_sparql_operation_started_total'
            before=[s for s in parsed['samples'] if s['tEndMono']<=lo]
            after=[s for s in parsed['samples'] if s['tStartMono']>=hi]
            if not before or not after:raise ValueError('counter samples must bracket the complete window')
            first=metric_counter(before[-1],metric);last=metric_counter(after[0],metric)
            if set(first)!=set(last) or any(last[k]<first[k] for k in first):raise ValueError('counter incarnation changed')
            delta=sum(last[k]-first[k] for k in first)
        elif root in ('T1','T2'):
            wire=parsed['wire'];queries=[q for q in wire['queries'] if lo<=q['tStart']<=hi]
            for tag in spec.get('requiredTags',[]):
                if not any((q.get('tag') or q.get('queryId'))==tag and (q.get('outcome')=='success' if root=='T1' else q.get('status')==200) for q in queries):raise ValueError('required read control absent')
            delta=sum(q['kind']=='write' for q in queries)
        else:raise ValueError('no mutation normalizer requires X1/Q1 or an independent T1/T2 stream')
        # The zero-based delta preserves equality; non-dense XTDB IDs are not transaction counts.
        return {'engineMutationCounterBefore':0,'engineMutationCounterAfter':delta}
    if protocol=='PREABORT':
        target=spec['requestId'];tags=[];observations=[]
        if root in ('X6','Q3'):
            for event in parsed.get('logRecords',[]):
                if root=='X6' and 'Interpreting SQL:' in event.get('message',''):
                    sql=event['message'].split('Interpreting SQL:',1)[1].strip();tag=wire_tag(sql)
                    tags.append((event['tMono'],tag));observations.append((event['tMono'],tag,sql))
                elif root=='Q3' and event.get('event')=='start':
                    tags.append((event['tMono'],event['qid']));observations.append((event['tMono'],event['qid'],event['query'].strip()))
        elif root in ('T1','T2'):
            tags=[(q['tStart'],q.get('tag') or q.get('queryId')) for q in parsed['wire']['queries']]
            observations=[(q['tStart'],q.get('tag') or q.get('queryId'),(q.get('sql') or q.get('query') or '').strip()) for q in parsed['wire']['queries']]
        else:raise ValueError('unsupported preabort source')
        controls=spec.get('controls')
        if not controls:raise ValueError('preabort requires an evaluator-frozen exact control inventory')
        if spec.get('targetQuery') in spec.get('backgroundQueries',[]):raise ValueError('ambiguous preabort target/background')
        for t,tag,sql in observations:
            if not lo<=t<=hi:continue
            if sql in spec.get('backgroundQueries',[]):continue
            if tag!=target and (tag not in controls or sql!=controls[tag]):raise ValueError('unattributed/unexpected statement in preabort window')
        for control in controls:
            if sum(lo<=t<=hi and tag==control for t,tag in tags)!=1:raise ValueError('missing or duplicated preabort control')
        return {'requestId':target,'engineStatementLog':[{'t':t,'tag':tag} for t,tag in tags if lo<=t<=hi and tag==target],
            'coverage':{'from':lo,'to':hi,'maxGapMs':0,'segments':[{'from':parsed['samples'][0]['tStartMono'],'to':parsed['samples'][-1]['tEndMono']}]}}
    if protocol=='CONNECTIONS' and root=='H4':
        pools=spec['pools'];rows=[]
        for sample in parsed['samples']:
            for pool in pools:
                count=sum(s['state']=='01' and int(s['local'].rsplit(':',1)[1],16)==pool['port'] for s in sample['sockets'])
                rows.append({'t':sample['tEndMono'],'label':pool['label'],'count':count})
        baseline={p['label']:next(r['count'] for r in rows if r['label']==p['label']) for p in pools}
        return {'poolDeclarations':[{'label':p['label'],'max':p['max']} for p in pools], 'engineConnectionSamples':rows,'baseline':baseline,
                'tClose':parsed['samples'][0]['runStartedMono']+spec['closeOffsetMs']}
    if protocol=='SCRATCH' and root=='X4':
        results=[s['queryResult'] for s in parsed['samples'] if 'queryResult' in s and s['queryResult']['relation']==spec['relation']]
        before=[r for r in results if r['label']=='before'];after=[r for r in results if r['label']=='after']
        if len(before)!=1 or len(after)!=1 or spec.get('unknownOutcomes',[]):raise ValueError('scratch requires two count witnesses and no unresolved outcomes')
        def count(r):
            rows=r['rows']
            if len(rows)!=1 or set(rows[0])!={'n'} or type(rows[0]['n']) is not int:raise ValueError('count result shape')
            return rows[0]['n']
        return {'relation':spec['relation'],'countBefore':count(before[0]),'countAfter':count(after[0]),'resolutionReceipts':[],'unknownOutcomes':[]}
    if protocol=='RESOURCE' and root=='H1':
        samples=[s for s in parsed['samples'] if 'resource' in s]
        if not samples or spec['envelope']['owners']!=[samples[0]['resource']['owner']]:raise ValueError('resource source does not cover every declared owner')
        peaks=[{'owner':s['resource']['owner'],'rss':s['resource']['memory']['memory.peak'],'disk':s['resource']['disk'],'t':s['tEndMono']} for s in samples]
        if any(s['resource']['memory']['memory.peak']>s['resource']['memory']['memory.max'] for s in samples):raise ValueError('invalid cgroup cap')
        return {'forecast':spec['forecast'],'peaks':peaks,'envelope':spec['envelope'],'obligation':spec['obligation']}
    raise ValueError('protocol lacks complete facts in this source: '+protocol+'/'+source_id)
