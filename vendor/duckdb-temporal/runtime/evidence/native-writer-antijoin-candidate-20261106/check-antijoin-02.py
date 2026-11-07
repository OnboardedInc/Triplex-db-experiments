from pathlib import Path
import datetime,hashlib,json,math,os,stat
run=Path("<writer-source-runtime>/build/native-writer-lab-antijoin-20261106/candidate-01");stage=Path("<writer-source-runtime>/build/native-writer-lab-20261106-01/runtime");source=Path("<writer-source-runtime>");measured=Path("<qualified-build02-runtime>")
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
outer=read(run/'cpp_candidate.json');terminal=read(run/'outer-terminal.json');binding=read(Path("<writer-source-runtime>/build/native-writer-lab-20261106-01/binding-first.json"))
assert terminal['exitCode']==0 and outer['status']=='passed'and outer['role']=='cpp_candidate'
assert outer['artifactsSourcePackagesHeadersUnchanged']and outer['sourceUnchanged']
assert outer['source']['sha256Before']==outer['sourceSha256After']=='3712516b8de8e371f71ae89aaab04f1d456da7a0fc6caa178ec0042926b0e6b3'
assert outer['source']['evidenceSha256']=='5321690cd6e5cf26ca28332af19b6c59716ddaa785f4c8460657d1a6f95873e7'
assert outer['originalBudget']['sha256']=='e992830b1427176b97a6bb8bd6ebfb4658da8c4eb4e044dbec43746e23f43d43'
assert outer['originalBaseline']['baseline']['sha256']=='f4d93fc4b1ae313beb784b78ef1ce98e5667a6db7019d18fe5fe82555692b474'
assert outer['originalBaseline']['baselineReceipt']['sha256']=='b20cc58126b0d77cd27fbeb80f2b37c814b8e32c0482efc26921b80d260affba'
assert [p['readerCount']for p in outer['profiles']]==[1,16]
expectedImages={str(Path(binding['actual']['dependencies'][x]).resolve())for x in ['platform','engine']}
expectedImages.update(str((stage/x).resolve())for x in ['build/temporal_control.node','build/temporal_datalog.duckdb_extension','build/owner_probe/temporal_owner_probe.duckdb_extension','build/owner_probe/temporal_writer.node'])
assert len(expectedImages)==6
profiles=[];allCommands=set();totalSamples=0;totalAcks=0;gates=[]
for profile in outer['profiles']:
 n=profile['readerCount'];config=profile['config'];pid=profile['terminal']['pid'];d=read(Path(config['output']));assert d==profile['raw']
 assert d['status']=='passed'and d['reopenVerified']and len(d['cells'])==2
 assert profile['terminal']['code']==0 and profile['terminal']['signal']is None
 assert config['runtime']==str(stage)and config['samples']==20 and config['warmup']==1 and config['durationSeconds']==60
 assert config['threads']==4 and config['memoryLimit']=='2GB'and config['maxTempDirectorySize']=='4GB'and config['maxIntermediateBytes']==4294967296
 ps=read(run/f'child-{n}-process-observation.json');assert ps['psExit']==0 and ps['pid']==pid and ps['parentPid']==terminal['pid']
 assert json.loads(ps['psStdout'].split('--child ',1)[1].strip())==config
 ready=read(run/'cpp_candidate-children/roles'/f'cpp_candidate-{pid}-ready.json');end=read(run/'cpp_candidate-children/roles'/f'cpp_candidate-{pid}-exit.json')
 association=dict(role='cpp_candidate',pid=pid,parentPid=terminal['pid'],runtime=str(stage),bindingSha256='8fb1915bd21dc29f7a8567af561124802d47b2a188ed9c496f31a264436052fe',entry=str(measured/'adapter/benchmark-antijoin-cost.mjs'),entryKind='measured_child',childOutput=config['output'],readerCount=n)
 for name,value in association.items():assert ready[name]==value and end[name]==value
 assert end['status']=='process_role_and_cleanup_verified'and end['routes']['errors']==end['routes']['unknown']==end['routes']['sdkGenerated']==0 and end['routes']['nativeGenerated']>0
 assert end['afterCleanup']==dict(liveHandles=0,pendingCompletions=0,asyncContexts=0,asyncResources=0,lifecycleOwners=0)
 assert {str(Path(p).resolve())for p in end['loadedImages']}==expectedImages
 db=Path(config['database']);s=db.lstat();assert stat.S_ISREG(s.st_mode)and not db.is_symlink()and not Path(str(db)+'.wal').exists()
 assert profile['cloneAfterExit']['closedWithoutWal']
 proof=d['inputAdmissionProof'];assert proof['exactSucceeded']and proof['minusOneRejected']=='TD_E_QUERY_SCALE_LIMIT'
 assert proof['scopedInputFacts']==int(proof['rightSideFacts'])+int(proof['positiveSideFacts'])and proof['positiveSideFacts']==256
 probe=int(d['probe']['position']);assert probe==39095 and len(d['seedBatches'])==8 and int(d['sourceFixture']['position'])==39087
 fixed,mixed=d['cells'];assert not fixed['mixedIngestion']and mixed['mixedIngestion']and mixed['finalReadVerified']and not mixed['writeLimitReached']
 assert len(fixed['samples'])==20*n and fixed['writes']==[]
 writes=mixed['writes'];assert len(d['receiptDetails'])==len(writes)
 for i,w in enumerate(writes):
  assert int(w['position'])==probe+i+1 and not w['reconciled']and w['commandId']not in allCommands
  allCommands.add(w['commandId'])
 for detail in d['receiptDetails']:assert detail['asserted']==2 and detail['retracted']==2
 def answer(k):
  if k<probe:
   seed=k-(probe-8);assert 0<=seed<8;indices=range(seed*32)
  else:
   count=k-probe;assert 0<=count<=len(writes);rounds,rem=divmod(count,256);indices=range(rem,256)if rounds%2==0 else range(rem)
  return [[dict(tag='str',value=f'probe-{i:03d}')]for i in indices]
 assert d['firstReads']['beforeProbe']['rows']==[] and int(d['firstReads']['beforeProbe']['position'])==39087
 assert d['firstReads']['afterProbe']['rows']==answer(probe)
 for check in [*d['reuseChecks'],*d['reopenChecks']]:assert int(check['position'])==int(check['knownAt'])and check['rows']==answer(int(check['position']))
 for cell in [fixed,mixed]:
  assert cell['status']=='passed'and cell['errors']==[]and cell['writeAcknowledgementErrors']==[]
  assert cell['pool']['after']==dict(capacity=n,available=n,active=0,waiting=0)and cell['pool']['maxObservedActive']==n
  assert {v['reader']for v in cell['samples']}==set(range(n))
  for v in [cell['firstReadAfterOpen'],*cell['samples']]:
   assert v['route']=='sql'and v['reason'].startswith('owned_')and v['kind']=='anti_join'
   assert v['rows']==len(answer(int(v['position'])))
   if not cell['mixedIngestion']or v['cut']=='fixed':assert int(v['position'])==probe
   if cell['mixedIngestion']and v['cut']=='latest':
    acked=sum(w['startOffsetMs']+w['elapsedMs']<=v['startOffsetMs']for w in writes)
    issued=sum(w['startOffsetMs']<=v['startOffsetMs']+v['elapsedMs']for w in writes)
    assert probe+acked<=int(v['position'])<=probe+issued
  xs=sorted(v['elapsedMs']for v in cell['samples'])
  for key,f in [('p50',.5),('p99',.99)]:assert math.isclose(xs[math.ceil(len(xs)*f)-1],cell['latencyMs'][key],rel_tol=1e-9,abs_tol=1e-6)
  assert math.isclose(len(xs)*1000/cell['wallMs'],cell['throughputQueriesPerSecond'],rel_tol=1e-9,abs_tol=1e-6)
 span=writes[-1]['startOffsetMs']+writes[-1]['elapsedMs']-writes[0]['startOffsetMs'];assert math.isclose(span,mixed['writeBurstDurationMs'],abs_tol=1e-6)
 rate=len(writes)*1000/span;windows=[sum(i*10000<=w['startOffsetMs']+w['elapsedMs']<(i+1)*10000 for w in writes)for i in range(math.floor(mixed['wallMs']/10000))];assert all(windows)
 limits=profile['performance']['limits'];rss=max(c['resources']['maxSampledRssBytes']for c in [fixed,mixed])
 checks=dict(fixedP50=fixed['latencyMs']['p50']<=limits['maxFixedP50Ms'],fixedP99=fixed['latencyMs']['p99']<=limits['maxFixedP99Ms'],mixedQPS=mixed['throughputQueriesPerSecond']>=limits['minMixedQueriesPerSecond'],mixedP50=mixed['latencyMs']['p50']<=limits['maxMixedP50Ms'],mixedP99=mixed['latencyMs']['p99']<=limits['maxMixedP99Ms'],writes=len(writes)>=limits['minAcknowledgedWrites'],writesPerSecond=rate>=limits['minAcknowledgedWritesPerSecond'],sampledRss=rss<=limits['maxSampledRssBytes'])
 assert checks==profile['performance']['gates'];gates.extend(dict(readers=n,name=k,passed=v)for k,v in checks.items())
 totalSamples+=len(fixed['samples'])+len(mixed['samples']);totalAcks+=len(writes)
 profiles.append(dict(readers=n,pid=pid,probeK=probe,fixedSamples=len(fixed['samples']),fixedP50=fixed['latencyMs']['p50'],fixedP99=fixed['latencyMs']['p99'],mixedReads=len(mixed['samples']),qps=mixed['throughputQueriesPerSecond'],p50=mixed['latencyMs']['p50'],p99=mixed['latencyMs']['p99'],acks=len(writes),ackRate=rate,rss=rss,windows=windows,finalK=probe+len(writes),maxActive=n,closedWithoutWal=True,exactSixImages=True,zeroCleanup=True,latestFrontiersPassed=True,inputAdmission=proof))
result=dict(schema='td.native-writer-antijoin-independent-check/1',status='passed'if all(v['passed']for v in gates)else'failed_budget',recordedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),passed=sum(v['passed']for v in gates),gates=gates,totalSamples=totalSamples,totalNativeACKs=totalAcks,profiles=profiles,rawOuterSha256=sha(run/'cpp_candidate.json'),boundary='Full typed answer equality in-flight; offline independently verifies saved typed preflight/reuse/reopen tuples and sample cardinalities/knowledge frontiers, original16 formulas.')
with(run/'independent-check-first.json').open('x')as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps(result))
