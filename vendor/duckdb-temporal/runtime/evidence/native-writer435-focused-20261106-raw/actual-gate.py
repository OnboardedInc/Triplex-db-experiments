from pathlib import Path
import datetime,hashlib,json,os,re,shutil,stat,subprocess,sys,time,traceback

C=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-regression-20261106/runtime')
A=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-validation-20261106/runtime')
NODE=Path('[LOCAL_PATH_0043]')
TSC=Path('[LOCAL_PATH_0044]')
HEAD='659ace02feaaa4fe1d779644b84c0f6e42fb2097'
BASE='51d4d0f738d6ca6a17413aaf218d2389d39f90f0'
PREFIX='projects/temporal-datalog/runtime/'
OUT=C/'build/qualification-writer435-20261106-01'
REF=json.loads((C/'evidence/native-writer-values-20261106-raw/before-tests-first.json').read_text())
FULL=json.loads((C/'evidence/native-writer-full512-20261106-raw/before-first.json').read_text())
CHANGED={f'build/adapter/test-{name}.js' for name in ['sdk-admission','sdk-admission-independent','readers','owned-store','fatal']}
ADDED={'build/adapter/native-writer-test-fault.js','build/adapter/native-writer-test-fault.d.ts'}
SOURCE_CHANGED={name.replace('build/adapter/','adapter/').replace('.js','.ts') for name in CHANGED}
OVERLAYS={'adapter/native-writer-test-fault.ts','verify.py','NATIVE-WRITER-REGRESSION-PLAN.md','NATIVE-WRITER-435-STAGING-ADDENDUM.md'}
ENV={**os.environ,'UV_THREADPOOL_SIZE':'4',
 'TD_TEST_PRE_BATCH_BUILD':'__HANDOFF_ROOT__/duckdb-temporal/current/runtime/build/retained-diagnostics-20261105/accepted-026',
 'TD_SDK_ADMISSION_SOURCE':FULL['source']['file'],'TD_SDK_ADMISSION_RECIPE':FULL['recipe']['file']}

def digest(path):
 h=hashlib.sha256()
 with Path(path).open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=C)
def save(name,data):
 with (OUT/name).open('x') as f:json.dump(data,f,indent=2);f.write('\n')
def emit(**data):print(json.dumps(data),flush=True)
def union(*maps):
 result={}
 for values in maps:
  for name,value in values.items():
   if name in result:assert result[name]==value,('conflicting map',name)
   result[name]=value
 return dict(sorted(result.items()))
def selected(data):
 marker=b"test('independent full512 "
 assert data.count(marker)==1
 start=data.index(marker);end=data.index(b'\ntest(',start)
 result=data[start:end]
 assert b'independent full512 native patch trace retains every returned cut and restores all256 entities' in result
 return result
def runtime_map():
 result={}
 for root in [C/'build',C/'node_modules']:
  for folder,dirs,files in os.walk(root,followlinks=False):
   if Path(folder)==C/'build':dirs[:]=[d for d in dirs if d!=OUT.name]
   dirs[:]=[d for d in dirs if not (Path(folder)/d).is_symlink()]
   for filename in files:
    path=Path(folder)/filename
    if path.is_symlink():continue
    assert path.is_file(),path
    result[str(path.relative_to(C))]=digest(path)
 return dict(sorted(result.items()))
def source_maps():
 owned={};metadata=[]
 for name,expected in REF['source'].items():
  path=C/name;value=digest(path);owned[name]=value
  if name in SOURCE_CHANGED:
   assert path.read_bytes()==git('show',HEAD+':'+PREFIX+name),name
  elif name.endswith('.md'):
   assert path.read_bytes()==git('show',BASE+':'+PREFIX+name),name
   if value!=expected:metadata.append({'file':name,'recorded':expected,'acceptedA51d':value})
  else:assert value==expected,('unexpected source delta',name)
 for name in OVERLAYS:
  path=C/name;assert path.read_bytes()==git('show',HEAD+':'+PREFIX+name),name
  owned[name]=digest(path)
 native={name:digest(C/name) for name in REF['native']}
 assert native==REF['native'],'native source drift'
 return {'owned':dict(sorted(owned.items())),'native':native,'acceptedMetadataDeltas':metadata}
def external():
 routes={}
 for name,expected in FULL['externalRoutes'].items():
  path=C/'node_modules'/name
  assert path.is_symlink(),path
  literal=os.readlink(path);resolved=str(path.resolve())
  assert literal==expected['literalTarget'] and resolved==expected['resolvedTarget'],name
  routes[name]={'literalTarget':literal,'resolvedTarget':resolved}
 entries={}
 for name,pin in FULL['externalEntryPins'].items():
  path=C/'node_modules'/name
  assert str(path.resolve())==pin['resolved'] and digest(path)==pin['sha256'],name
  entries[name]=pin
 headers={}
 for name,pin in FULL['headerPins'].items():
  assert digest(pin['file'])==pin['sha256'],name
  headers[name]=pin
 assert digest(NODE)==FULL['nodeExecutable']['sha256'],'Node executable drift'
 code="""const {createRequire}=require('node:module');const {realpathSync}=require('node:fs');const {dirname,join}=require('node:path');const r=createRequire(process.argv[1]);const api=r.resolve('@duckdb/node-api');const ar=createRequire(api);const bindings=ar.resolve('@duckdb/node-bindings');const br=createRequire(bindings);const platform=br.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');console.log(JSON.stringify({api,bindings,platform,engine:realpathSync(join(dirname(platform),'libduckdb.dylib')),nodeExecutable:process.execPath,nodeVersion:process.version}));"""
 resolution=json.loads(subprocess.check_output([str(NODE),'-e',code,str(C/'build/adapter/native-duckdb-port.mjs')],cwd=C))
 for key in ['api','bindings','platform','engine']:
  relative=Path(FULL['sdkResolution'][key]).relative_to(A)
  assert resolution[key]==str(C/relative),(key,resolution[key])
  assert digest(resolution[key])==REF['dependencies'][str(relative)],key
 assert resolution['nodeExecutable']==str(NODE) and resolution['nodeVersion']=='v24.13.0'
 core=json.loads((C/'build/artifact.json').read_text());owner=json.loads((C/'build/owner_probe/artifact.json').read_text())
 for key,path in [('extension_sha256','build/temporal_datalog.duckdb_extension'),('library_sha256','build/temporal_datalog.so'),('control_bridge_sha256','build/temporal_control.node')]:assert core[key]==digest(C/path)
 assert owner['extension_sha256']==digest(C/'build/owner_probe/temporal_owner_probe.duckdb_extension')
 assert owner['library_sha256']==digest(C/'build/owner_probe/temporal_owner_probe.so')
 assert owner['core_extension_sha256']==core['extension_sha256']
 assert owner['engine_library_sha256']==digest(resolution['engine'])
 assert owner['native_writer']['addon_sha256']==digest(C/'build/owner_probe/temporal_writer.node')
 assert owner['native_writer']['node_version']=='v24.13.0' and owner['native_writer']['abi']==1
 assert owner['native_writer']['node_executable_sha256']==digest(NODE)
 catalog=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-build-20261105-02/runtime/build/catalog_sql.hpp')
 assert digest(catalog)==core['catalog_sql_sha256']
 source_manifest=Path('[LOCAL_PATH_0112]')
 assert json.loads(source_manifest.read_text())==FULL['sourceManifest']
 return {'routes':routes,'selectedEntries':entries,'headers':headers,'node':FULL['nodeExecutable'],'sdkResolution':resolution,
  'originalGeneratedCatalog':{'file':str(catalog),'sha256':digest(catalog)},'duckdbSourceManifest':FULL['sourceManifest']}
def fixtures():
 result={}
 for name in ['source','recipe']:
  pin=FULL[name];path=Path(pin['file']);s=path.stat()
  assert digest(path)==pin['sha256'],name
  result[name]={'file':str(path),'sha256':pin['sha256'],'bytes':s.st_size,'mtimeNs':s.st_mtime_ns,'ctimeNs':s.st_ctime_ns}
 assert not Path(FULL['source']['file']+'.wal').exists(),'source WAL exists'
 old=Path(ENV['TD_TEST_PRE_BATCH_BUILD']);assert old.is_dir()
 assert (old/'artifact.json').is_file() and (old/'temporal_datalog.duckdb_extension').is_file()
 result['preBatchBuild']=str(old);result['cloneHelperSha256']=digest(C/'adapter/clone-benchmark-fixture.py')
 assert result['cloneHelperSha256']==FULL['cloneHelperSha256']
 return result
def snapshot():return {'runtime':runtime_map(),'source':source_maps(),'external':external(),'fixtures':fixtures()}
def process(label,args,expected=None):
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
 with (OUT/(label+'.stdout')).open('xb') as out,(OUT/(label+'.stderr')).open('xb') as err:
  p=subprocess.Popen(args,cwd=C,env=ENV,stdout=out,stderr=err)
  terminal={'command':args,'pid':p.pid,'startedAtUtc':started,'status':'running'}
  (OUT/(label+'.terminal.json')).write_text(json.dumps(terminal,indent=2)+'\n')
  emit(phase=label,status='started',pid=p.pid)
  code=p.wait()
 terminal.update(status='terminal',exitCode=code,endedAtUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedMs=(time.monotonic()-clock)*1000)
 if expected is not None:
  tap=(OUT/(label+'.stdout')).read_text();m=re.findall(r'^# pass (\d+)$',tap,re.M)
  terminal['tapPass']=int(m[-1]) if m else None;terminal['expectedSelectedPass']=expected
  terminal['tapFail']=re.findall(r'^# fail (\d+)$',tap,re.M)
  terminal['tapCancelled']=re.findall(r'^# cancelled (\d+)$',tap,re.M)
 (OUT/(label+'.terminal.json')).write_text(json.dumps(terminal,indent=2)+'\n')
 emit(phase=label,status='terminal',exitCode=code,passed=terminal.get('tapPass'))
 assert code==0,(label,'exit',code)
 if expected is not None:assert terminal['tapPass']==expected and terminal['tapFail']==['0'] and terminal['tapCancelled']==['0'],(label,terminal)
 return terminal

os.chdir(C)
assert git('rev-parse','HEAD').decode().strip()==HEAD,'wrong committed source'
assert not (C/'build').exists() and not (C/'node_modules').exists(),'stage destination is not fresh'
assert not os.environ.get('NODE_OPTIONS') and not [k for k,v in os.environ.items() if k.startswith('TD_NATIVE_WRITER_LAB_') and v],'lab environment present'
OUT.mkdir(parents=True);shutil.copyfile(__file__,OUT/'actual-gate.py')
baseline=union(REF['compiled'],REF['dependencies'])
summary={'schema':'td.native-writer435-focused/1','sourceCommit':HEAD,'baseSourceCommit':BASE,'status':'running','baselineCounts':{'compiled':len(REF['compiled']),'dependencies':len(REF['dependencies']),'union':len(baseline)},'tests':[]}
try:
 assert summary['baselineCounts']=={'compiled':186,'dependencies':395,'union':581}
 emit(phase='stage',status='started',files=len(baseline))
 for name,value in baseline.items():
  relative=Path(name);assert not relative.is_absolute() and '..' not in relative.parts and relative.parts[0] in ['build','node_modules'],name
  original=A/name;target=C/name
  assert stat.S_ISREG(original.lstat().st_mode) and digest(original)==value,('reference',name)
  target.parent.mkdir(parents=True,exist_ok=True)
  with original.open('rb') as source,target.open('xb') as destination:shutil.copyfileobj(source,destination)
  assert digest(target)==value,('copied',name)
 for name,pin in FULL['externalRoutes'].items():
  target=C/'node_modules'/name;target.parent.mkdir(parents=True,exist_ok=True);os.symlink(pin['literalTarget'],target)
 before=snapshot();assert before['runtime']==baseline
 source_block=selected((C/'adapter/test-sdk-admission-independent.ts').read_bytes())
 assert source_block==selected(git('show',BASE+':'+PREFIX+'adapter/test-sdk-admission-independent.ts'))
 save('before-stage-tsc.json',before)
 emit(phase='stage',status='passed',files=len(before['runtime']))
 summary['tsc']=process('tsc-first',[str(NODE),str(TSC),'-p','tsconfig.json'])
 after=snapshot();actual=after['runtime']
 removed=set(baseline)-set(actual);added=set(actual)-set(baseline)
 changed={name for name in baseline if name in actual and baseline[name]!=actual[name]}
 delta={'removed':sorted(removed),'added':sorted(added),'changed':sorted(changed),'compiledCount':len(actual)-len(REF['dependencies']),'unionCount':len(actual)}
 save('tsc-first-delta.json',delta);save('after-tsc-first.json',after)
 assert not removed and added==ADDED and changed==CHANGED,delta
 assert after['source']==before['source'] and after['external']==before['external'] and after['fixtures']==before['fixtures'],'pre/post TSC drift'
 assert selected((A/'build/adapter/test-sdk-admission-independent.js').read_bytes())==selected((C/'build/adapter/test-sdk-admission-independent.js').read_bytes()),'compiled512 block changed'
 summary['selected512']={'sourceEqualA51d':True,'compiledEqualA':True,'sourceBlockSha256':hashlib.sha256(source_block).hexdigest(),'compiledBlockSha256':hashlib.sha256(selected((C/'build/adapter/test-sdk-admission-independent.js').read_bytes())).hexdigest()}
 summary['delta']=delta
 save('pre-tests-first.json',after)
 emit(phase='preflight',status='passed',compiled=delta['compiledCount'],union=delta['unionCount'],selected512='source_and_emitted_equal')
 common=[str(NODE),'--test','--test-concurrency=1','--test-reporter=tap']
 cases=[
 ('sdk-admission-first',common+['build/adapter/test-sdk-admission.js'],5),
 ('independent-small-first',common+['--test-skip-pattern=^independent full512 native patch trace retains every returned cut and restores all256 entities$','build/adapter/test-sdk-admission-independent.js'],4),
 ('reader-barrier-first',common+['--test-name-pattern=^pooled admission includes reads awaiting the writer barrier$','build/adapter/test-readers.js'],1),
 ('owned-transport-abi-first',common+['--test-name-pattern=^(native validation failure and injected writer transport interruption preserve owned reads|required ownership verifies the engine resolved by the SDK with a shadow platform package)$','build/adapter/test-owned-store.js'],2),
 ('fatal-transport-first',common+['--test-name-pattern=^(a native writer transport fatal fences writer, active readers and queued readers with its original cause|ordinary writer transport OOM and an embedded fatal phrase preserve healthy instance reuse)$','build/adapter/test-fatal.js'],2)]
 for label,args,expected in cases:
  terminal=process(label,args,expected);summary['tests'].append(terminal)
  current=snapshot();save(label+'-after-pins.json',current)
  assert current==after,(label,'source/runtime/external/fixture drift')
 summary['selectedMethodsPassed']=sum(t['tapPass'] for t in summary['tests']);assert summary['selectedMethodsPassed']==14
 summary['status']='passed_focused14_not_full435';summary['full435Run']=False;summary['nativeRebuild']=False;summary['packageInstall']=False
except BaseException as error:
 summary['status']='failed_first_outcome';summary['failure']={'type':type(error).__name__,'message':str(error),'trace':traceback.format_exc()}
 try:save('failure-post-pins.json',snapshot())
 except BaseException as cleanup:summary['postPinFailure']={'type':type(cleanup).__name__,'message':str(cleanup)}
 save('first-summary.json',summary);emit(phase='gate',status=summary['status'],error=str(error));raise
else:
 save('first-summary.json',summary);emit(phase='gate',status=summary['status'],passed=summary['selectedMethodsPassed'])
