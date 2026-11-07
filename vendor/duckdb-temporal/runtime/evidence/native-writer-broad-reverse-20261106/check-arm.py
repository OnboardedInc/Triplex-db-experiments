from pathlib import Path
import datetime,hashlib,json,math,os,stat,sys
run=Path(os.environ['TD_WRITER_RUN']);role=sys.argv[1];assert role in ['cpp_candidate','sdk_control']
q=run/role;read=lambda p:json.loads(p.read_text())
bindingPath=Path(os.environ['TD_WRITER_BINDING']);bindingBytes=bindingPath.read_bytes();binding=read(bindingPath)
assert hashlib.sha256(bindingBytes).hexdigest()=='8fb1915bd21dc29f7a8567af561124802d47b2a188ed9c496f31a264436052fe'
stage=Path(os.environ['TD_WRITER_STAGE']);measured=Path(os.environ['TD_MEASURED_SOURCE'])
terminal=read(q/'terminal.json');assert terminal['exitCode']==0 and terminal['status']=='terminal' and terminal['role']==role
argv=terminal['argv'];assert argv[1]==str(measured/'adapter/benchmark-scale.mjs')
assert argv[argv.index('--output')+1]==str(q/'result.json') and argv[argv.index('--runtime')+1]==str(stage)
assert argv[argv.index('--readers')+1]=='1,4,16' and argv[argv.index('--samples')+1]=='5'
ready=read(q/'process'/f"{role}-{terminal['pid']}-ready.json");end=read(q/'process'/f"{role}-{terminal['pid']}-exit.json")
expected=dict(role=role,pid=terminal['pid'],parentPid=ready['parentPid'],runtime=str(stage),bindingSha256=hashlib.sha256(bindingBytes).hexdigest(),entry=argv[1],entryKind='measured_parent',childOutput=None,readerCount=None,UV_THREADPOOL_SIZE='4',selectedPortUrl=(stage/'build/adapter/native-duckdb-port.mjs').as_uri())
for name,value in expected.items():assert ready[name]==value and end[name]==value,(name,value)
assert end['status']=='process_role_and_cleanup_verified'
assert end['preloadSha256']==binding['actual']['labSource']['native-writer-lab-preload.mjs']==ready['preloadSha256']
assert end['routes']['errors']==0 and end['routes']['unknown']==0 and end['routes']['nativeEnrollment']==11
assert end['routes']['nativeGenerated'if role=='cpp_candidate'else'sdkGenerated']>0
assert end['routes']['sdkGenerated'if role=='cpp_candidate'else'nativeGenerated']==0
assert end['afterCleanup']==dict(liveHandles=0,pendingCompletions=0,asyncContexts=0,asyncResources=0,lifecycleOwners=0)
expectedImages={str(Path(binding['actual']['dependencies'][key]).resolve())for key in ['platform','engine']}
expectedImages.update(str((stage/name).resolve())for name in ['build/temporal_control.node','build/temporal_datalog.duckdb_extension','build/owner_probe/temporal_owner_probe.duckdb_extension','build/owner_probe/temporal_writer.node'])
actualImages={str(Path(p).resolve())for p in end['loadedImages']}
assert len(expectedImages)==6 and actualImages==expectedImages
assert len(end['writerPorts'])==11 and all(len(p['workerConnectionIds'])==1 for p in end['writerPorts'])
d=read(q/'result.json');assert d['status']=='passed' and len(d['stages'])==1
s=d['stages'][0];assert s['status']=='passed' and len(s['cells'])==10
assert s['fixture']['size']==10000000 and s['fixture']['position']=='39087' and s['fixture']['initialAdded']==22
assert s['fixture']['groupSize']==256 and s['fixture']['setupRoute']=='closed_fixture_clone'
db=(measured/d['fixtureDirectory']/s['database']).resolve();a=db.lstat();assert stat.S_ISREG(a.st_mode) and not db.is_symlink()
assert db!=Path(os.environ['TD_WRITER_FIXTURE']).resolve() and not Path(str(db)+'.wal').exists()
fixed={};mixed=None;counts=[];frontierViolations=[];allSamples=0
for cell in s['cells']:
 n=cell['readerCount'];assert cell['status']=='passed' and cell['errors']==[] and cell['writeAcknowledgementErrors']==[]
 assert cell['pool']['after']==dict(capacity=n,available=n,active=0,waiting=0)
 assert cell['pool']['maxObservedActive']==n
 assert {v['reader']for v in cell['samples']}==set(range(n))
 for v in [cell['firstReadAfterOpen'],*cell['samples']]:
  assert v['route']=='sql' and v['reason'].startswith('owned_')
  assert v['rows']==dict(count=1,grouped_count=8,projection=256)[v['kind']]
  assert 39087<=int(v['position'])<=39087+len(cell['writes'])
  if not cell['mixedIngestion']or v['cut']=='fixed':assert int(v['position'])==39087
 if cell['mixedIngestion']:assert mixed is None;mixed=cell
 else:assert len(cell['samples'])==5*n and cell['writes']==[];fixed[n,cell['kind']]=cell
 allSamples+=len(cell['samples']);counts.append(dict(readers=n,kind=cell['kind'],mixed=cell['mixedIngestion'],samples=len(cell['samples']),acks=len(cell['writes']),maxActive=cell['pool']['maxObservedActive']))
assert len(fixed)==9 and mixed['readerCount']==16 and mixed['finalReadVerified']and mixed['reopenVerified']and not mixed['writeLimitReached']
writes=mixed['writes'];assert writes and len({w['commandId']for w in writes})==len(writes)
assert all(int(w['position'])==39088+i and not w['reconciled']for i,w in enumerate(writes))
for v in mixed['samples']:
 if v['cut']=='fixed':continue
 before=sum(w['startOffsetMs']+w['elapsedMs']<=v['startOffsetMs']for w in writes)
 issued=sum(w['startOffsetMs']<=v['startOffsetMs']+v['elapsedMs']for w in writes)
 if not 39087+before<=int(v['position'])<=39087+issued:frontierViolations.append(v)
assert frontierViolations==[]
windows=[sum(i*10000<=w['startOffsetMs']+w['elapsedMs']<(i+1)*10000 for w in writes)for i in range(math.floor(mixed['wallMs']/10000))]
assert all(windows)
summary=dict(schema='td.native-writer-broad-role-checkpoint/1',status='passed',atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),role=role,nodePid=terminal['pid'],wrapperPid=ready['parentPid'],wrapperArgv=[os.environ['TD_PINNED_PYTHON'],str(run/'launcher.py'),role],wrapperPidSource='Actual ready/exit parentPid; wrapper command from recorded launch, not an inferred native executor ID',terminal=terminal,rawSha256=hashlib.sha256((q/'result.json').read_bytes()).hexdigest(),exactSixImages=sorted(actualImages),routes=end['routes'],afterCleanup=end['afterCleanup'],clone=dict(path=str(db),bytes=a.st_size,mtimeNs=str(a.st_mtime_ns),closedWithoutWal=True),cells=counts,totalSamples=allSamples,mixedReads=len(mixed['samples']),nativeACKs=len(writes),ackWindows=windows,latestFrontierViolations=frontierViolations,finalK=str(39087+len(writes)),typedAnswerProof='Exact full tuples checked by unchanged public driver in flight; raw samples retain row counts, not complete answer tuples')
with(q/'functional-checkpoint.json').open('x')as f:json.dump(summary,f,indent=2);f.write('\n')
print(json.dumps({k:summary[k]for k in ['status','role','nodePid','wrapperPid','totalSamples','mixedReads','nativeACKs','ackWindows','finalK']}))
