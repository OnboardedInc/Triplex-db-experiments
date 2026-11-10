#!/usr/bin/env python3
# [DX-S3] Why: retain every overlap and unclassified tail; time coincidence is evidence, not exclusive causation.
# Rejected: assigning an entire native minute's maximum to individual commands without transaction-level evidence.
import pathlib, json, re, datetime, sys, collections, math, hashlib
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3')
def stamp(text):
    return datetime.datetime.fromisoformat(text.replace('Z','+00:00')).timestamp()*1000

def stats(values):
    xs=sorted(x for x in values if x is not None and math.isfinite(x))
    return {'n':len(xs),**{k:(xs[min(len(xs)-1,int(len(xs)*p))] if xs else None) for k,p in [('p50',.5),('p90',.9),('p99',.99),('max',1)]}}

def infer_window_bindings(commands,native_ordered,probe_low,probe_high):
    if any('nativeT' in c for c in commands): return {}
    if len({c['receipt']['position'] for c in commands})!=len(commands): return {}
    first=min(c['startWallMs'] for c in commands);last=max(c['endWallMs'] for c in commands)
    candidates=[n for n in native_ordered if first+probe_low-5<=n['end']<=last+probe_high+5]
    ordered=sorted(commands,key=lambda c:c['receipt']['position'])
    if len(candidates)!=len(commands) or len({n['t'] for n in candidates})!=len(candidates): return {}
    if not all(c.get('datoms')==n['datoms'] for c,n in zip(ordered,candidates)): return {}
    return {c['receipt']['position']:n['t'] for c,n in zip(ordered,candidates)}

def overlap_bounds(event_start,event_end,command_start,command_end,low,high):
    mid=(low+high)/2
    return (event_start<=command_end+mid and event_end>=command_start+mid,
            event_start<=command_end+low and event_end>=command_start+high,
            event_start<=command_end+high and event_end>=command_start+low)

def analyze(bench):
    result=json.loads((bench/'result.json').read_text())
    stack=ROOT/result['prefix']
    if not (stack/'cleanup.json').exists(): return None
    if not (stack/'pg-stdout.log').exists() or not list((stack/'tx-logs').glob('*.log')) or any(not list((stack/(role+'-gc')).glob('dxs3-gc.log*')) for role in ['tx','gw-w','gw-r']):
        (bench/'analysis-unavailable.json').write_text(json.dumps({'reason':'Native logs not captured; absence of events cannot be inferred.','prefix':result['prefix'],'availableSteps':list(result['steps'])},indent=2))
        return None
    # [DX-S3] Why: do not associate native events with a different source/container attempt.
    # Rejected: relying on a directory name or a historical success flag.
    source_checks={
        'runnerCopyMatches':hashlib.sha256((bench/'runner.mjs').read_bytes()).hexdigest()==result['sourceHashes']['lab/experiments/EXP-DX1/s3/bench.mjs'],
        'gatewayManifestMatches':hashlib.sha256((stack/'gateway-files.json').read_bytes()).hexdigest()==json.loads((stack/'stack.json').read_text())['gatewaySourceSha256'],
        'sameContainerIds':{c['id'] for c in result['containers']}=={c['id'] for c in json.loads((stack/'stack.json').read_text())['containers']}}
    assert all(source_checks.values()),source_checks
    events=[]; memory=[]; metrics=[]; indexes=[]; native_transactions=[]; native_storage=[]; adoption=[]
    for role in ['tx','gw-w','gw-r']:
        for file in sorted((stack/(role+'-gc')).glob('*')):
            for line in file.read_text().splitlines():
                m=re.match(r'\[([^]]+)\]',line)
                if not m: continue
                end=stamp(m[1]); duration=None; kind=None
                if 'safepoint' in line and (n:=re.search(r'Total: (\d+) ns',line)):
                    duration=float(n[1])/1e6;kind='safepoint'
                elif 'Pause' in line and (n:=re.search(r'(\d+(?:\.\d+)?)ms$',line)):
                    duration=float(n[1]);kind='gc'
                if duration is not None and duration>10:
                    events.append({'kind':'transactor-pause' if role=='tx' else 'gateway-pause','role':role,'subkind':kind,'start':end-duration,'end':end,'durationMs':duration,'source':str(file.relative_to(ROOT)),'line':line})
    native='\n'.join(p.read_text() for p in sorted((stack/'tx-logs').glob('*.log')))
    opened={}
    for line in native.splitlines():
        try: time=stamp(line[:23].replace(' ','T')+'+00:00')
        except ValueError: continue
        if ':event :tx/process' in line:
            def field(name):
                m=re.search(':'+name+r' ([\d.Ee+-]+)',line)
                return float(m[1]) if m else None
            t=field('t'); duration=field('msec')
            if t is not None and duration is not None:
                native_transactions.append({'t':int(t),'start':time-duration,'end':time,'datoms':int(field('datom-count')),'applyMs':field('apply-msec'),'processMs':duration,'txFnMs':field('tx-fn-ms'),'line':line})
        if ':event :kv-cluster/update-pod' in line and ':phase :end' in line:
            m=re.search(r':msec ([\d.Ee+-]+)',line)
            if m and float(m[1])>20: native_storage.append({'start':time-float(m[1]),'end':time,'durationMs':float(m[1]),'line':line})
        if ':event :update/new-index' in line:
            m=re.search(r':nextT (\d+)',line)
            if m:adoption.append({'at':time,'nextT':int(m[1]),'line':line})
        if ':event :update/create-index' in line:
            key=(re.search(r':id "([^"]+)"',line)[1],re.search(r':next-t (\d+)',line)[1])
            if ':phase :begin' in line: opened[key]=(time,line)
            elif ':phase :end' in line:
                begin,begin_line=opened.pop(key,(None,None))
                if begin is not None:
                    event={'kind':'index-job','start':begin,'end':time,'durationMs':time-begin,'database':key[0],'nextT':key[1],'line':line,'beginLine':begin_line}
                    events.append(event);indexes.append(event)
        if ':event :metrics,' in line:
            fields={}
            for name,lo,hi,total,count in re.findall(r':(\w+) \{:lo ([\d.Ee+-]+), :hi ([\d.Ee+-]+), :sum ([\d.Ee+-]+), :count (\d+)\}',line):
                fields[name]={'min':float(lo),'max':float(hi),'sum':float(total),'n':int(count)}
            metrics.append({'at':time,'metrics':fields,'line':line})
        if 'mem-index' in line or re.search(r'MemoryIndex|MemIndex|:Memory',line): memory.append({'at':time,'line':line})
    pg=(stack/'pg-stdout.log').read_text(); checkpoint=None
    for line in pg.splitlines():
        m=re.search(r'(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC',line)
        if not m: continue
        time=stamp(m[1].replace(' ','T')+'+00:00')
        if 'checkpoint starting:' in line: checkpoint=(time,line)
        if 'checkpoint complete:' in line:
            if checkpoint:
                events.append({'kind':'checkpoint','start':checkpoint[0],'end':time,'line':line,'beginLine':checkpoint[1]}); checkpoint=None
        if (m:=re.search(r'duration: ([\d.]+) ms',line)):
            duration=float(m[1])
            if duration>20: events.append({'kind':'slow-postgres','start':time-duration,'end':time,'durationMs':duration,'line':line})
    if checkpoint:
        events.append({'kind':'checkpoint','start':checkpoint[0],'end':max(n['end'] for n in native_transactions)+1000,'line':checkpoint[1],'incompleteAtEnd':True,'endIsCensorBound':True})
    kinds=['transactor-pause','gateway-pause','index-job','checkpoint','slow-postgres','previous-over500']
    output={'prefix':result['prefix'],'bench':str(bench),'analysisGeneratedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'analyzerSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'windows':{},'events':events,'nativeMinuteMetrics':metrics,'memoryIndexLogEvidence':memory,'unpairedIndexBegins':list(opened.values()),'sourceBindingChecks':source_checks}
    all_commands=[]
    for p in bench.glob('*-raw.json'):
        if 'seed-cuts' not in p.name:
            data=json.loads(p.read_text())
            if isinstance(data,list): all_commands.extend(x for x in data if 'receipt' in x)
    native_by_t={n['t']:n for n in native_transactions}
    native_ordered=sorted(native_transactions,key=lambda n:n['t'])
    native_prev={n['t']:native_ordered[i-1] if i else None for i,n in enumerate(native_ordered)}
    ordered=sorted(all_commands,key=lambda c:c['receipt']['position'])
    previous={c['receipt']['position']:ordered[i-1] if i else None for i,c in enumerate(ordered)}
    probe=(stack/'clock.txt').read_text().splitlines()
    probe_low=(float(probe[1])-float(probe[2]))*1000
    probe_high=(float(probe[1])-float(probe[0]))*1000
    output['clockDomain']='Native event times are VM UTC; client times are host UTC.'
    output['clockProbeOffsetMs']={'low':probe_low,'high':probe_high}
    bindings=[]
    for label in ['step5-serial','serial-1','serial-2','serial-3','burst-1','burst-2','burst-3','with-readers','index-initial','index-1','index-2','index-3','index-readers']:
        f=bench/(label+'-raw.json')
        if not f.exists(): continue
        commands=json.loads(f.read_text())
        if not commands:
            output.setdefault('emptyCommandWindows',[]).append(label);continue
        ordered_commands=sorted(commands,key=lambda c:c['receipt']['position'])
        first_host=min(c['startWallMs'] for c in commands)
        last_host=max(c['endWallMs'] for c in commands)
        # [DX-S3] Why: the first runner did not save response t. Accept only a full-window,
        # ordered datom-count match; never guess a native transaction from latency alone.
        inferred=infer_window_bindings(commands,native_ordered,probe_low,probe_high)
        def native_t(c): return c.get('nativeT',inferred.get(c['receipt']['position']))
        matched=[(c,native_by_t[native_t(c)]) for c in commands if native_t(c) in native_by_t]
        # Correct the VM clock using native intervals contained in client service intervals.
        # Two milliseconds cover timestamp truncation/rounding on the two clocks.
        own={c['receipt']['position']:(n['end']-c['endWallMs']-2,n['start']-c['startWallMs']+2) for c,n in matched}
        assert all(lo<=hi for lo,hi in own.values()),'native duration cannot fit the client interval'
        anchors=[c for c,n in matched if own[c['receipt']['position']][1]-own[c['receipt']['position']][0]<=20]
        local={};calibrations=[]
        for c in commands:
            lo,hi=own.get(c['receipt']['position'],(probe_low,probe_high))
            near=[x for x in anchors if abs(x['startMs']-c['startMs'])<=1000]
            anchor=min(near,key=lambda x:abs(x['startMs']-c['startMs'])) if near else c
            alo,ahi=own.get(anchor['receipt']['position'],(lo,hi))
            nominal=min(hi,max(lo,(alo+ahi)/2))
            local[c['receipt']['position']]=(lo,hi,nominal)
            calibrations.append({'position':c['receipt']['position'],'nativeT':native_t(c),'lowMs':lo,'highMs':hi,'nominalMs':nominal,'anchorPosition':anchor['receipt']['position'],'anchorDistanceMs':abs(anchor['startMs']-c['startMs']),'method':'nearest <=20 ms-wide anchor within one second' if near else 'own containment midpoint'})
        import statistics
        low=min(x[0] for x in local.values());high=max(x[1] for x in local.values());offset=statistics.median(x[2] for x in local.values())
        clock={'lowMs':low,'highMs':high,'nominalMs':offset,'intervalBoundsConsistent':True,
            'singleOffsetExists':max(x[0] for x in own.values())<=min(x[1] for x in own.values()),
            'localNominalMinMs':min(x[2] for x in local.values()),'localNominalMaxMs':max(x[2] for x in local.values()),
            'method':'per-command containment bounds; nearest fast-command anchor for nominal overlap',
            'transactionBinding':'native response t' if any('nativeT' in c for c in commands) else ('whole-window ordered datom sequence' if inferred else 'unbound'),
            'probeLowMs':probe_low,'probeHighMs':probe_high,'nativeMatches':len(matched),'inferredMatches':len(inferred)}
        slow=[];counts=collections.Counter();service_counts=collections.Counter();exposure=collections.Counter();certain_counts=collections.Counter();possible_counts=collections.Counter()
        for c in commands:
            low,high,offset=local[c['receipt']['position']]
            start=c['scheduledWallMs']+offset;end=c['endWallMs']+offset
            overlaps=[i for i,e in enumerate(events) if e['start']<=end and e['end']>=start]
            service=[i for i in overlaps if events[i]['end']>=c['startWallMs']+offset]
            certain=[i for i,e in enumerate(events) if e['start']<=c['endWallMs']+low and e['end']>=c['scheduledWallMs']+high]
            possible=[i for i,e in enumerate(events) if e['start']<=c['endWallMs']+high and e['end']>=c['scheduledWallMs']+low]
            categories={events[i]['kind'] for i in overlaps}
            certain_categories={events[i]['kind'] for i in certain}
            possible_categories={events[i]['kind'] for i in possible}
            service_categories={events[i]['kind'] for i in service}
            t=native_t(c);n=native_by_t.get(t)
            prev_native=native_prev.get(t)
            prev=previous.get(c['receipt']['position'])
            if prev_native and prev_native['datoms']>500:
                pn,pc,pp=overlap_bounds(prev_native['start'],prev_native['end'],c['scheduledWallMs'],c['endWallMs'],low,high)
                if pn:categories.add('previous-over500')
                if pc:certain_categories.add('previous-over500')
                if pp:possible_categories.add('previous-over500')
                if prev_native['end']>=c['startWallMs']+offset and prev_native['start']<=end:service_categories.add('previous-over500')
            if not categories:categories.add('none')
            if not service_categories:service_categories.add('none')
            if not possible_categories:
                certain_categories.add('none');possible_categories.add('none')
            elif not certain_categories:possible_categories.add('none')
            exposure.update(categories)
            if inferred: bindings.append({'window':label,'position':c['receipt']['position'],'nativeT':t,'clientDatoms':c['datoms'],'nativeDatoms':n['datoms'],'method':clock['transactionBinding']})
            if c['latencyMs']<=50: continue
            counts.update(categories);service_counts.update(service_categories);certain_counts.update(certain_categories);possible_counts.update(possible_categories)
            slow.append({k:c.get(k) for k in ['sequence','subject','facts','datoms','scheduledWallMs','startWallMs','endWallMs','latencyMs','serviceMs','gatewayMicros','transactMicros']}|{'nativeT':t,'bindingMethod':clock['transactionBinding'],'clockLowMs':low,'clockHighMs':high,'clockNominalMs':offset,'position':c['receipt']['position'],'categories':sorted(categories),'certainCategories':sorted(certain_categories),'possibleCategories':sorted(possible_categories),'serviceCategories':sorted(service_categories),'eventIndexes':overlaps,'possibleEventIndexes':possible,'certainEventIndexes':certain,'previousNativeT':prev_native['t'] if prev_native else None,'previousNativeEndVM':prev_native['end'] if prev_native else None,'previousDatoms':prev_native['datoms'] if prev_native else (prev.get('datoms') if prev else None),'nativeProcess':n,'nativeStorageOverlaps':[n for n in native_storage if n['start']<=end and n['end']>=start]})
        first=min(c['scheduledWallMs']+local[c['receipt']['position']][0] for c in commands);last=max(c['endWallMs']+local[c['receipt']['position']][1] for c in commands)
        index_jobs=[e for e in indexes if e['start']<=last and e['end']>=first]
        cpu=[];cf=bench/(label+'-cpu-raw.json')
        if cf.exists():
            rows=json.loads(cf.read_text());prev=None
            for row in rows:
                m=re.search(r'usage_usec (\d+)',row['stdout'])
                if not m:continue
                usage=int(m[1]);at=(row['requestedAtMs']+row['observedAtMs'])/2
                if prev:cpu.append({'at':at,'cpuCores':(usage-prev[1])/(at-prev[0])/1000,'probeMs':row['observedAtMs']-row['requestedAtMs']})
                prev=(at,usage)
        output['windows'][label]={
            'latency':stats(c['latencyMs'] for c in commands),'service':stats(c['serviceMs'] for c in commands),
            'datoms':stats(c.get('datoms') for c in commands),'gatewayMs':stats((c.get('gatewayMicros') or 0)/1000 for c in commands),
            'nativeTransactMs':stats((c.get('transactMicros') or 0)/1000 for c in commands),
            'nativeApplyMs':stats(n['applyMs'] for c,n in matched),'nativeProcessMs':stats(n['processMs'] for c,n in matched),
            'slowCount':len(slow),'clockCorrection':clock,'clockCalibration':calibrations,'nativeWindowEnvelope':{'low':first,'high':last},
            'attribution':{k:{'count':counts[k],'share':counts[k]/len(slow) if slow else 0,'certain':certain_counts[k],'possible':possible_counts[k]} for k in kinds+['none']},
            'serviceAttribution':dict(service_counts),'allCommandExposure':dict(exposure),
            'checks':{'uniquePositions':len({c['receipt']['position'] for c in commands})==len(commands),
                'uniqueSequences':len({c['sequence'] for c in commands})==len(commands),
                'orderedIntervals':all(c['scheduledWallMs']<=c['startWallMs']+1 and c['endWallMs']>=c['startWallMs'] for c in commands),
                'latencyFormulasMatch':all(abs(c['latencyMs']-(c['endMs']-c['scheduledMs']))<1e-6 and abs(c['serviceMs']-(c['endMs']-c['startMs']))<1e-6 for c in commands),
                'requestScopeMatches':all(c['request']['path']=='/v1/db/'+result['jsonIndexDisabled']['database']+'/transact' and c['request']['position']==c['receipt']['position'] and c['request']['datoms']==c['datoms'] for c in commands),
                'nativeMatches':len(matched),'gatewaySamples':sum(isinstance(c.get('gatewayMicros'),(int,float)) and math.isfinite(c['gatewayMicros']) and c['gatewayMicros']>0 for c in commands),'transactSamples':sum(isinstance(c.get('transactMicros'),(int,float)) and math.isfinite(c['transactMicros']) and c['transactMicros']>0 for c in commands),'nativeDatomMismatches':sum(c.get('datoms')!=n['datoms'] for c,n in matched),
                'nativeOutsideClientInterval':sum(n['end']<c['startWallMs']+local[c['receipt']['position']][2]-5 or n['start']>c['endWallMs']+local[c['receipt']['position']][2]+5 for c,n in matched)},
            'slowCommands':slow,'indexJobs':index_jobs,'cpuPerSecond':cpu,'cpuSummary':stats(c['cpuCores'] for c in cpu),
            'nativeMinutes':[m for m in metrics if m['at']>=first and m['at']-60000<=last]}
    assert all(v['certain']<=v['count']<=v['possible'] for w in output['windows'].values() for v in w['attribution'].values()),'clock-overlap count bounds'
    (bench/'derived-native-bindings.json').write_text(json.dumps(bindings,indent=2))
    output['nativeBinding']={'commands':len(all_commands),'withNativeT':sum('nativeT' in c for c in all_commands),'derivedMatched':len(bindings),
        'matched':sum(c.get('nativeT') in native_by_t for c in all_commands),
        'datomMismatches':[{'t':c.get('nativeT'),'client':c.get('datoms'),'native':native_by_t[c['nativeT']]['datoms']} for c in all_commands if c.get('nativeT') in native_by_t and c.get('datoms')!=native_by_t[c['nativeT']]['datoms']]}
    # Native logs have no continuous memory-index-byte gauge. Preserve a clearly named datom proxy.
    cumulative=0; txs=[]
    for n in native_ordered:
        cumulative+=n['datoms'];txs.append((n['t'],cumulative))
    import bisect
    ts=[n[0] for n in txs]
    timeline=[]; cumulative=0
    for n in native_ordered:
        cumulative+=n['datoms']
        prior=[a for a in adoption if a['at']<=n['end']]
        cut=prior[-1]['nextT'] if prior else 0
        off=bisect.bisect_left(ts,cut)-1
        indexed=txs[off][1] if off>=0 else 0
        timeline.append({'at':n['end'],'t':n['t'],'datomsSinceAdoptedIndex':cumulative-indexed,'adoptedNextT':cut})
    (bench/'native-transactions.json').write_text(json.dumps(native_transactions))
    (bench/'memory-index-datom-proxy.json').write_text(json.dumps(timeline))
    (bench/'analysis.json').write_text(json.dumps(output,indent=2))
    return output
if __name__=='__main__':
    rows=[]
    for bench in sorted(ROOT.glob('bench-*/')):
        out=analyze(bench)
        if out:
            rows.append({'prefix':out['prefix'],'bench':str(bench),'windows':{label:{k:w[k] for k in ['latency','service','slowCount','attribution','cpuSummary','datoms']} for label,w in out['windows'].items()}})
    (ROOT/'analysis-summary.json').write_text(json.dumps(rows,indent=2))
    print(json.dumps([{'prefix':r['prefix'],'windows':{k:v['latency']|{'over50':v['slowCount']} for k,v in r['windows'].items()}} for r in rows],indent=2))
