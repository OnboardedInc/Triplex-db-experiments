from pathlib import Path
import datetime,hashlib,json,os,signal,subprocess,traceback
root=Path.cwd();log=Path(__file__).resolve().parent
admitted=json.loads((root/'build/qualification-active-start-20261106-04/after-preparation-first.json').read_text())
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def exact(path,value):
 actual=digest(path);assert actual==value,(str(path),actual,value);return actual
def save(name,value):(log/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def snapshot():
 data={}
 for category in ['physicalUnion','native','ownedSource']:
  data[category]={name:exact(root/name,value) for name,value in admitted[category].items()}
 data['newInputPins']={}
 for name,entry in admitted['newInputPins'].items():data['newInputPins'][name]={**entry,'sha256':exact(root/name,entry['sha256'])}
 data['headerPins']={}
 for name,entry in admitted['headerPins'].items():data['headerPins'][name]={**entry,'sha256':exact(Path(entry['file']),entry['sha256'])}
 data['externalRoutes']={}
 for name,route in admitted['externalRoutes'].items():
  path=root/'node_modules'/name;assert os.readlink(path)==route['literalTarget'] and str(path.resolve())==route['resolvedTarget'];data['externalRoutes'][name]=route
 data['externalEntryPins']={}
 for name,entry in admitted['externalEntryPins'].items():
  path=root/'node_modules'/name;assert str(path.resolve())==entry['resolved'];data['externalEntryPins'][name]={**entry,'sha256':exact(path,entry['sha256'])}
 data['nodeExecutable']={**admitted['nodeExecutable'],'sha256':exact(Path(admitted['nodeExecutable']['file']),admitted['nodeExecutable']['sha256'])}
 data['sdkResolution']=admitted['sdkResolution']
 for name in ['api','bindings','platform','engine']:
  path=Path(admitted['sdkResolution'][name]);assert str(path.resolve())==str(path);exact(path,admitted['physicalUnion'][str(path.relative_to(root))])
 data['priorFailures']={name:digest(root/name) for name in ['build/qualification-active-start-20261106-01/preparation-first.json','build/qualification-active-start-20261106-01/first.py','build/qualification-active-start-20261106-02/tsc-first-terminal.json','build/qualification-active-start-20261106-02/tsc-first.log']}
 return data
record={'schema':'td.native-writer-active-start-first-execution/1','status':'preflight','requestedAtUtc':stamp(),'launcherPid':os.getpid(),'driverSha256':digest(Path(__file__)),'sourceCommit':'011fcb44ef29d06557186a85d703a68575105169','workerSourceCommit':'4902695462c043cf68947d28170a65c8c5c9af71','protocolCommit':'f9a9874ac886f6b545947945010d8daeb3dc3da6','scope':'Started before termination request, not active-at-cleanup or per-Worker zero metrics'}
save('execution-first.json',record);before=None
try:
 assert len(admitted['physicalUnion'])==584
 before=snapshot();save('before-first.json',before)
 fixtures_before=sorted(str(p.relative_to(root)) for p in (root/'build').glob('native-writer-active-start-*'));assert fixtures_before==[]
 save('fixture-paths-before.json',fixtures_before)
 node=admitted['nodeExecutable']['file'];command=[node,'--test','--test-concurrency=1','--test-reporter=tap','build/adapter/test-native-writer-active-teardown.js']
 env=dict(os.environ);env.pop('NODE_OPTIONS',None)
 for key in list(env):
  if key.startswith('TD_NATIVE_WRITER_LAB_'):env.pop(key)
 env['UV_THREADPOOL_SIZE']='4'
 record.update(status='running',argv=command,environment={'UV_THREADPOOL_SIZE':'4','NODE_OPTIONS':None,'TD_NATIVE_WRITER_LAB_variables':[]},startedAtUtc=stamp())
 with (log/'test-first.tap').open('xb') as output:
  process=subprocess.Popen(command,cwd=root,env=env,stdout=output,stderr=subprocess.STDOUT);record['pid']=process.pid;save('execution-first.json',record);print('ACTIVE_FIRST_NODE_PID',process.pid,flush=True)
  watchdog=False
  try:code=process.wait(timeout=60)
  except subprocess.TimeoutExpired:
   watchdog=True;save('watchdog-first.json',{'pid':process.pid,'argv':command,'recordedAtUtc':stamp(),'timeoutSeconds':60,'status':'failed_outer_diagnostic_watchdog_before_owned_process_retirement'})
   process.terminate()
   try:code=process.wait(timeout=5)
   except subprocess.TimeoutExpired:process.kill();code=process.wait()
 record.update(status='terminal',exitCode=code,endedAtUtc=stamp(),watchdogOccurred=watchdog,signal=signal.Signals(-code).name if code<0 else None)
 save('execution-first.json',record);print('ACTIVE_FIRST_TERMINAL',json.dumps(record),flush=True)
 after=snapshot();assert after==before;save('after-first.json',after)
 fixtures_after=sorted(p for p in (root/'build').glob('native-writer-active-start-*'))
 classified=[]
 for directory in fixtures_after:
  assert directory.is_dir() and not directory.is_symlink();files={}
  for path in directory.rglob('*'):
   if path.is_file():
    assert not path.is_symlink();info={'bytes':path.stat().st_size}
    if path.suffix not in ['.duckdb','.wal']:info['sha256']=digest(path)
    files[str(path.relative_to(root))]=info
  classified.append({'directory':str(directory.relative_to(root)),'files':files})
 save('owned-fixture-output-classification.json',classified)
 record.update(fixed584PrePostExact=True,priorFailuresUnchanged=True,ownedFixtureCount=len(classified),status='passed' if code==0 and not watchdog else 'failed',terminalSha256=digest(log/'test-first.tap'))
 save('execution-first.json',record)
 print('ACTIVE_FIRST_FIXED_POSTPINS_PASS',json.dumps({'exitCode':code,'status':record['status'],'fixed584PrePostExact':True,'ownedFixtureCount':len(classified),'tapSha256':record['terminalSha256']}),flush=True)
 if code!=0 or watchdog:raise SystemExit(1)
except BaseException as error:
 if not isinstance(error,SystemExit):record.update(status='failed',failure={'name':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()})
 record['lastRecordedAtUtc']=stamp();save('execution-first.json',record)
 print('ACTIVE_FIRST_STOP',json.dumps({'status':record['status'],'failure':record.get('failure'),'exitCode':record.get('exitCode')}),flush=True);raise
