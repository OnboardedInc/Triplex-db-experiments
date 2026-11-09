# [EXP-OBS01] Why: derive the remaining families from native replies and observer events.
# Rejected: passing a JSON protocol record through the collector as purported vendor evidence.
EXTRA_PROTOCOLS={'CANCEL','AVAILABILITY','SCALE-COUNT','WORK','MAINTENANCE','ERASURE-SCAN','WATERMARK','ACK-ORDER','FAULT-TRANSITIONS'}

def resident_normalize(data,spec,source_id):
    # [EXP-OBS01] Why: an authenticated old event is still stale; the pinned parser binds each sample to this case and engine.
    # Rejected: trusting phase labels or a fresh HMAC as proof that embedded wire events occurred in this attempt.
    anchor=None
    for frame,raw in frames(data):
        expected={'runId':spec['runId'],'engineContainerId':spec['engineContainerId'],'sourceId':source_id,'caseSha256':hashlib.sha256(json.dumps(spec,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest()}
        if any(frame.get(k)!=v for k,v in expected.items()):raise ValueError('resident sample binding mismatch')
        if frame.get('streamId') not in [sid for sid,kind in spec['sources'] if kind.split('/')[-1]==source_id]:raise ValueError('resident stream binding mismatch')
        if anchor is None:anchor=frame['runStartedMono']
        if frame['runStartedMono']!=anchor or not anchor<=frame['tStartMono']<=frame['tEndMono']:raise ValueError('resident sample predates attempt')
        try:event=json.loads(raw)
        except (ValueError,UnicodeDecodeError):continue
        for e in [event]+event.get('wire',[]):
            if 'tMono' in e and not anchor<=e['tMono']<=frame['tEndMono']:raise ValueError('embedded event predates attempt or lies in future')
    return derive_resident(normalize(data),spec,source_id.split('.')[0])[0]

def native_sessions(parsed):
    sessions=[]
    for sample in parsed['samples']:
        event=sample.get('event',{})
        if event.get('event')!='native-session':continue
        wire=pgwire_records(event['wire'])
        incomplete=any(c.get('serverDecodeError') for c in wire['connections'])
        for query in wire['queries']:
            for phase in event.get('phases',[event['phase']]):
                sessions.append({**query,'phase':phase,'observationId':event['observationId'],'incompleteReply':incomplete})
    return sessions

def exact_nonnegative(value):
    if type(value) is not int or value<0:raise ValueError('native counter must be an exact nonnegative integer')
    return value

def one_native(queries,phase):
    rows=[q for q in queries if q['phase']==phase and q.get('outcome')=='success' and q['kind']=='read']
    if len(rows)!=1 or rows[0].get('incompleteReply'):raise ValueError('one complete successful native read required: '+phase)
    return rows[0]

def row_native(queries,phase):
    q=one_native(queries,phase)
    if len(q['rows'])!=1:raise ValueError('one native result row required: '+phase)
    return q['rows'][0]

def derive_extra(parsed,spec,root):
    protocol=spec['protocol'].removeprefix('OBS-')
    allowed={'CANCEL':{'X6','X7','T1','Q3','Q4','T2'},'AVAILABILITY':{'HR','X1','X2','H8','Q1'},'SCALE-COUNT':{'X4','T1','Q5','T2'},'WORK':{'X3','X7','X8','H1','H3','Q1','Q8','T2'},'MAINTENANCE':{'X1','X3','X6','H1','Q1','Q9'},'ERASURE-SCAN':{'H6'},'WATERMARK':{'T1','H8','T2','Q1'},'ACK-ORDER':{'X3','X7','H6','H7','HR'},'FAULT-TRANSITIONS':{'X3','X4','H6','T1','Q5','T2'}}
    if root not in allowed[protocol]:raise ValueError('source not allowed for protocol: '+protocol+'/'+root)
    queries=native_sessions(parsed)
    events=[s.get('event',{}) for s in parsed['samples']]
    output={};missing=[]
    def absent(reason):missing.append(reason)
    def phase(name):return any(q['phase']==name for q in queries)
    if protocol=='SCALE-COUNT':
        output['population']=spec['population']
        if phase('analytic-count'):
            row=row_native(queries,'analytic-count')
            expected={'configuredEntitiesLatest','distinctDomainSubjects','activeDomainFacts','activePresenceFacts','activeTypeVersionFacts','activeFixtureFacts','domainAssertionVersions','presenceAssertionVersions','typeVersionAssertionVersions','allFixtureAssertionVersions','fixtureRetirements','correctionEntities','presenceCycleEntities','configuredEntitiesDuringPresenceOff','schemaReleaseCalls','configFacts','receiptJournalClaimMetadata','domainCommands'}
            if set(row)!=expected:raise ValueError('analytic result must contain exactly the generator count columns')
            for k,v in row.items():
                if k not in ('configFacts','receiptJournalClaimMetadata'):exact_nonnegative(v)
                elif v is not None:raise ValueError('excluded metadata must be null')
            # Analytic expectation is evaluator-generated independently; this field is engine-only.
            output['countQueryCaseResult']=row
        else:absent('native analytic population query absent')
    elif protocol=='AVAILABILITY':
        failures=[q for q in queries if q.get('outcome')=='error']
        if failures:output['tFailure']=failures[0]['tEnd']
        else:absent('no observed failure')
        output['events']=[{'kind':e['kind'],'t':e['tMono']} for e in events if e.get('event')=='process-event']
        output['probes']=[{'kind':q['kind'],'t':q['tEnd'],'outcome':q['outcome']} for q in queries if q['phase'] in ('availability-read','availability-write') and 'tEnd' in q and q['kind'] in ('read','write')]
    elif protocol=='WORK':
        output.update(operation=spec['operation'],threshold=spec['threshold'])
        units={}
        for phase_name in ('work-candidate','work-comparison'):
            if not phase(phase_name):absent(phase_name+' native profiler absent');continue
            q=one_native(queries,phase_name);counters={};scan=[]
            for r in q['rows']:
                a=r.get('attributes') or {}
                if isinstance(a,str):a=json.loads(a)
                if 'scan_rows_read' in a:
                    value=Decimal(str(a['scan_rows_read']))
                    if not value.is_finite() or value!=value.to_integral_value():raise ValueError('inexact scan row counter')
                    scan.append(exact_nonnegative(int(value)))
                for col,key in [('rows_written','rowsWritten'),('triples_touched','triplesTouched'),('bytes_written','bytesWritten')]:
                    if col in a:counters[key]=counters.get(key,0)+exact_nonnegative(a[col])
            if scan:counters['rowsScanned']=sum(scan)
            # Missing units stay missing, never zero-filled from the SELECT spelling.
            for key in ('rowsScanned','rowsWritten','triplesTouched','bytesWritten'):
                if key not in counters:absent(phase_name+' lacks '+key)
            units[phase_name]=counters
        if 'work-candidate' in units:output['engineWorkUnits']=units['work-candidate']
        if 'work-comparison' in units:output['comparison']={'operation':spec['comparisonOperation'],'engineWorkUnits':units['work-comparison']}
    elif protocol=='MAINTENANCE':
        output.update(kind=spec['kind'],threshold=spec['threshold'])
        rows=parsed.get('logRecords',[])
        action={'compaction':'compact','index-rebuild':'rebuild','delta-merge':'merge','index-catch-up':'catch.?up'}[spec['kind']]
        starts=[r for r in rows if re.search(r'(?i)(starting|start).*'+action,r.get('message',''))]
        ends=[r for r in rows if re.search(r'(?i)(finished|completed).*'+action,r.get('message',''))]
        if starts and ends:
            output.update(tStart=starts[-1]['tMono'],tEnd=ends[-1]['tMono'])
            output['events']=[{'kind':k,'t':output[t]} for k,t in [('start','tStart'),('end','tEnd')]]
        else:absent('native maintenance start/end log absent')
        lag=[]
        for q in queries:
            if q['phase']=='maintenance-lag' and q.get('outcome')=='success':
                for row in q['rows']:
                    lag.append({'t':q['tEnd'],'lagMs':row['applied_mono']-row['published_mono']})
        if lag:output['lagSamples']=lag
        else:absent('durable consumer publication/checkpoint lag source absent')
    elif protocol=='CANCEL':
        wire=parsed.get('wire',{});qs=list(wire.get('queries',[]));cancels=list(wire.get('cancels',[]))
        for event in events:
            if event.get('event')=='native-session':
                decoded=pgwire_records(event['wire']);qs.extend(decoded['queries']);cancels.extend(decoded['cancels'])
        targets=[q for q in qs if q.get('tag')==spec['requestId']]
        if len(targets)==1:
            target=targets[0];cid=target['connectionId'];output.update(requestId=spec['requestId'],connectionId=cid,expectedError=spec['expectedError'])
            cancel=[c for c in cancels if c.get('targetConnectionId')==cid]
            if len(cancel)==1:output['tCancelRequested']=cancel[0]['t']
            else:absent('unique targeted CancelRequest absent')
            if target.get('sqlstate')=='57014':output.update(callerError='E-CANCELLED',tCallerSettled=target['tEnd'])
            else:absent('native cancellation outcome absent')
            reuse=[q for q in qs if q['connectionId']==cid and q.get('tag')==spec['reuseQueryId'] and q.get('outcome')=='success']
            if len(reuse)==1:
                q=reuse[0];output.update(reuseQueryId=spec['reuseQueryId'],reuseConnectionId=cid,tReuseOk=q['tEnd'],reuseResult={'queryId':spec['reuseQueryId'],'connectionId':cid,'outcome':'success','t':q['tEnd']})
            else:absent('same-connection successful reuse absent')
        else:absent('targeted cancellation wire transcript absent')
        active=[]
        for s in parsed['samples']:
            if 'response' in s and isinstance(s['response'],dict):active.append({'t':s['tEndMono'],'activeQueryIds':list(s['response'])})
        if active:output['engineActiveSamples']=active
        # Query disappearance alone does not establish a transport acknowledgement or exact drain.
        absent('independent drain and transport acknowledgement required')
    elif protocol in ('WATERMARK','ACK-ORDER'):
        route=None
        if phase('route-metadata'):
            row=row_native(queries,'route-metadata')
            # Flattened persisted composition columns; no opaque eligibility JSON is accepted.
            needed={'basis','watermark','stream','epoch','scope','generation','valid_instant','valid_from','valid_to','erasure_published','erasure_applied','incarnation','attribute','reconstruct_from','reconstruct_to','marker_state','published_positions','resolutions','recorded_time_bound','partial_or_conflicted','snapshot_before_incarnation','snapshot_before_marker','snapshot_after_incarnation','snapshot_after_marker'}
            if not needed<=set(row):raise ValueError('composition readback lacks typed eligibility columns')
            def pos(v):return {'stream':row['stream'],'epoch':exact_nonnegative(row['epoch']),'offset':exact_nonnegative(v),'ordinal':0}
            basis=pos(row['basis']);watermark=pos(row['watermark']);q=one_native(queries,'routed-read');index=spec['servingIndex']
            snap={'incarnation':row['incarnation'],'marker':watermark}
            eligibility={'index':index,'publishedPositions':[pos(x) for x in row['published_positions']],'resolutions':[{'position':pos(x['position']),'outcome':x['outcome']} for x in row['resolutions']],
              'scopeOwner':row['scope'],'queryScope':spec['scope'],'mappingGeneration':row['generation'],'queryMappingGeneration':spec['mappingGeneration'],
              'validInstant':row['valid_instant'],'validFrom':row['valid_from'],'validTo':row['valid_to'],'exactCut':basis,'queryCut':basis,
              'reconstructFrom':pos(row['reconstruct_from']),'reconstructTo':pos(row['reconstruct_to']),
              'erasurePublished':pos(row['erasure_published']),'erasureApplied':pos(row['erasure_applied']),
              'snapshot':{'mode':'single-request','before':{'incarnation':row['snapshot_before_incarnation'],'marker':pos(row['snapshot_before_marker'])},'answer':snap,'after':{'incarnation':row['snapshot_after_incarnation'],'marker':pos(row['snapshot_after_marker'])}},'recordedTimeBound':row['recorded_time_bound'],
              'markerState':row['marker_state'],'partialOrConflictedReferenced':row['partial_or_conflicted'],
              'attributes':[{'name':row['attribute'],'from':pos(row['reconstruct_from']),'to':pos(row['reconstruct_to'])}], 'queriedAttributes':spec['queriedAttributes']}
            # This profile handles one atomic marker+answer request only; multiple requests cannot borrow its fence.
            if q['observationId']!=one_native(queries,'route-metadata')['observationId']:raise ValueError('snapshot eligibility and answer must share one native request')
            read_start=next(e['tMono'] for e in events if e.get('event')=='read-start' and e['readId']==spec['readId'])
            route={'readId':spec['readId'],'basisPosition':basis,'watermarkAtRead':watermark,'servingIndex':index,'waitMs':q['tStart']-read_start,
             'route':'index','fallbackIndex':None,'eligibility':eligibility,'surfaceLanguage':'SQL','tReadStart':read_start,'tReadEnd':next(e['tMono'] for e in events if e.get('event')=='read-end' and e['readId']==spec['readId']),
             'tRouteStart':q['tStart'],'tRouteEnd':q['tEnd'],'waitEvents':{'start':{'kind':'read-start','readId':spec['readId'],'t':read_start},'end':{'kind':'engine-request','readId':spec['readId'],'t':q['tStart']}}}
        else:absent('atomic source/index eligibility and route readback absent')
        if protocol=='WATERMARK' and route:output=route
        if protocol=='ACK-ORDER':
            commits=[q for q in queries if q['phase']=='commit' and q.get('outcome')=='success' and q['kind']=='write']
            if len(commits)==1:
                output.update(tAck=commits[0]['tEnd'],ackSender=spec['sourceOfTruth'],sourceOfTruth=spec['sourceOfTruth'])
                if phase('publication-readback'):
                    publication=one_native(queries,'publication-readback');row=row_native(queries,'publication-readback')
                    if 'position' not in row:absent('native commit-position mapping absent');return output,missing
                    output.update(commitPosition=exact_nonnegative(row['position']),tSourcePublished=publication['tEnd'])
            else:absent('successful native commit response absent')
            if route:
                if not spec.get('routeStreamId'):absent('independently authenticated nested WATERMARK stream absent')
                else:
                    route['source']={'kind':spec['routeStreamKind'],'streamRefs':[spec['routeStreamId']],'records':dict(route)}
                    output['ryowPullRoute']=route
            absent('second independent non-HR publication/route witness required')
    elif protocol=='FAULT-TRANSITIONS':
        crashes=[e for e in events if e.get('event')=='process-event' and e.get('kind')=='client-crash']
        if crashes:output['tCrash']=crashes[-1]['tMono']
        else:absent('observer-witnessed client crash absent')
        output['variant']=spec['variant']
        if phase('fault-readback') and phase('commit') and crashes:
            row=row_native(queries,'fault-readback');commit=[q for q in queries if q['phase']=='commit' and q.get('outcome')=='success']
            if len(commit)!=1:raise ValueError('fault readback has no observed commit')
            if row.get('operation_id')!=spec['operationId']:raise ValueError('fault operation marker mismatch')
            if 'position' not in row or not commit[0]['rows']:
                absent('native transaction position is absent from commit/marker readback');return output,missing
            position=exact_nonnegative(row['position']);operation=spec['operationId'];t=commit[0]['tEnd']
            if commit[0]['rows']!=[{'position':position}]:raise ValueError('native commit position is not bound to readback marker')
            facts={'committed':True,'operationMarkerPresent':True,'transaction':{'operationId':operation,'position':position},'marker':{'operationId':operation,'position':position}}
            record={'transition':'XT2-ENGINE-COMMITTED','t':t,'operationId':operation,'position':position,'facts':facts}
            raw=json.dumps(record,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()
            obj={'sha256':hashlib.sha256(raw).hexdigest(),'record':record,'tReadBack':one_native(queries,'fault-readback')['tEnd'],'readbackOperationId':operation,'readbackPosition':position}
            last={'transition':record['transition'],'t':t,'durableEvidenceObject':obj};output.update(last);output['transitions']=[last]
        else:absent('post-crash native marker and transaction readback absent')
    elif protocol=='ERASURE-SCAN':
        # Publication comes from observed native readback, never the case's expected timestamp.
        if phase('erasure-publication'):
            output['tErasurePublished']=row_native(queries,'erasure-publication')['published_mono']
        else:absent('observed erasure publication readback absent')
        scans=[]
        for item in spec['scanInventory']:
            found=[]
            for e in events:
                if e.get('event')=='file-bytes' and e['location']==item['location']:
                    b=base64.b64decode(e['bytes'],validate=True)
                    if e.get('truncated') is not False or e.get('readOffset')!=0 or e.get('fileSize')!=len(b):
                        absent('incomplete physical file read at '+item['location']);continue
                    found.append((e,b))
            before=[x for x in found if x[0]['phase']=='before'];after=[x for x in found if x[0]['phase']=='after']
            canary=item['canary'];method=item['scanMethod']
            if len(before)!=1 or len(after)!=1 or before[0][1].count(canary.encode())==0:
                absent('blind/missing canary at '+item['location']);continue
            if method not in ('literal-byte-scan/1','utf8-utf16le-utf32le/1'):raise ValueError('unsupported physical decoder')
            control={'canary':canary,'tWritten':before[0][0]['tWritten'],'tFound':before[0][0]['tMono'],'hits':before[0][1].count(canary.encode()),'scanMethod':method,'location':item['location']}
            scan={'inventoryEntry':item['id'],'location':item['location'],'scanMethod':method,'plaintextHits':after[0][1].count(canary.encode()),'keyDestroyedEvidence':None,'tScan':after[0][0]['tMono'],'positiveControl':control}
            if method=='utf8-utf16le-utf32le/1':scan['derivedChannelHits']=sum(after[0][1].count(canary.encode(encoding)) for encoding in ('utf-16le','utf-32le'))
            else:absent('derived-channel decoder unavailable at '+item['location'])
            scans.append(scan)
        if scans:output.update(scans=scans,**{k:v for k,v in scans[0].items() if k!='positiveControl'})
        if not spec['scanInventory']:absent('complete protected-copy inventory is deferred to the scale window')
    return output,missing

def derive_resident(parsed,spec,root):
    protocol=spec['protocol'].removeprefix('OBS-')
    if protocol in EXTRA_PROTOCOLS:
        records,missing=derive_extra(parsed,spec,root)
        if protocol=='SCALE-COUNT' and 'countQueryCaseResult' in records:records['analyticCount']=records['countQueryCaseResult']
        if protocol=='AVAILABILITY' and root=='H8':
            records={}
            kernel=[s['event'] for s in parsed['samples'] if s.get('event',{}).get('event')=='lifecycle']
            if len(kernel)>=2:
                if kernel[0]['starttime']!=kernel[-1]['starttime']:records['events']=[{'kind':'manual-restart','t':kernel[-1]['tMono']}]
                else:records['events']=[]
                first=kernel[0]['oomKill']
                failure=next((e for e in kernel if e['oomKill']>first),None)
                if failure:records['tFailure']=failure['tMono']
                else:missing.append('no observed OOM-counter increase; failure time unavailable')
            else:missing.append('engine process/cgroup lifecycle observations absent')
        if root=='HR':records={k:v for k,v in records.items() if k in {'tCancelRequested','tCallerSettled','callerError','expectedError','tDeadline','tAck','ackSender','probes'}}
        return records,missing
    queries=native_sessions(parsed)
    if protocol=='SCRATCH':
        before=row_native(queries,'count-before')['n'];after=row_native(queries,'count-after')['n']
        return {'relation':spec['relation'],'countBefore':exact_nonnegative(before),'countAfter':exact_nonnegative(after),'unknownOutcomes':[],'resolutionReceipts':[]},[]
    if protocol=='PREABORT':return {},['resident traffic is not forced through the observer; cannot assert complete statement-log coverage']
    if protocol=='NO-MUTATION':
        if root=='X1':
            metrics=[s for s in parsed['samples'] if 'metrics' in s]
            if len(metrics)<2:return {},['two completed transaction gauge snapshots required']
            a=metric_counter(metrics[0],'node_tx_latestCompletedTxId');b=metric_counter(metrics[-1],'node_tx_latestCompletedTxId')
            if set(a)!=set(b) or any(b[k]<a[k] for k in a):raise ValueError('mutation counter incarnation changed')
            return {'engineMutationCounterBefore':0,'engineMutationCounterAfter':sum(b[k]-a[k] for k in a)},[]
        return {},['observer-only resident traffic cannot prove complete transport write inventory']
    if protocol=='CONNECTIONS':
        samples=[s for s in parsed['samples'] if 'sockets' in s];pools=spec['pools'];rows=[]
        for s in samples:
            for pool in pools:rows.append({'t':s['tEndMono'],'label':pool['label'],'count':sum(x['state']=='01' and int(x['local'].rsplit(':',1)[1],16)==pool['port'] for x in s['sockets'])})
        closes=[s['event']['tMono'] for s in parsed['samples'] if s.get('event',{}).get('event')=='pool-close']
        if not rows or not closes:return {},['socket baseline/close observations absent']
        return {'poolDeclarations':[{'label':p['label'],'max':p['max']} for p in pools],'baseline':{p['label']:next(r['count'] for r in rows if r['label']==p['label']) for p in pools},'tClose':closes[0],'engineConnectionSamples':rows},[]
    if protocol=='RESOURCE':
        samples=[s for s in parsed['samples'] if 'resource' in s]
        if not samples:return {},['engine cgroup and allocated-file snapshot absent']
        if any('rss' not in s['resource'] for s in samples):raise ValueError('attempt process RSS unavailable; lifetime cgroup peak is not RSS')
        if any(spec['envelope']['owners']!=[s['resource']['owner']] for s in samples):raise ValueError('RSS owner coverage mismatch')
        return {'forecast':spec['forecast'],'envelope':spec['envelope'],'obligation':spec['obligation'],'peaks':[{'owner':s['resource']['owner'],'rss':s['resource']['rss'],'disk':s['resource']['disk'],'t':s['tEndMono']} for s in samples]},[]
    raise ValueError('unsupported resident protocol')
