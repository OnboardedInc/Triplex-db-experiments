from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,traceback
root=Path.cwd();log=Path(__file__).resolve().parent
old=json.loads((root/'build/qualification-active-start-20261106-02/before-compile-first.json').read_text())
admission=json.loads((root/'build/qualification-active-start-20261106-03/source-fix-admission.json').read_text())
baseline=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-validation-20261106/runtime')
logs=[root/'build'/('qualification-active-start-20261106-'+n) for n in ['01','02','03','04']]
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def exact(path,expected):
 actual=digest(path);assert actual==expected,(str(path),actual,expected);return actual
def save(name,value):(log/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def build_files():return {str(p.relative_to(root)) for p in (root/'build').rglob('*') if p.is_file() and not any(p.is_relative_to(d) for d in logs)}
def deps_files():return {str(p.relative_to(root)) for p in (root/'node_modules').rglob('*') if p.is_file() and not p.is_symlink()}
resolve_js="import {createRequire} from 'node:module';import {dirname,join} from 'node:path';import {realpathSync} from 'node:fs';const req=createRequire(process.cwd()+'/build/adapter/native-duckdb-port.mjs');const api=req.resolve('@duckdb/node-api');const bindings=createRequire(api).resolve('@duckdb/node-bindings');const platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');process.stdout.write(JSON.stringify({api,bindings,platform,engine:realpathSync(join(dirname(platform),'libduckdb.dylib')),nodeExecutable:realpathSync(process.execPath),nodeVersion:process.version}));"
record={'schema':'td.native-writer-active-start-corrected-preparation/1','status':'running','startedAtUtc':stamp(),'pid':os.getpid(),'sourceCommit':admission['sourceCommit'],'stage':'preflight_exact_existing581','driverSha256':digest(Path(__file__)),'priorTscTerminalSha256':digest(root/'build/qualification-active-start-20261106-02/tsc-first-terminal.json'),'priorTscLogSha256':digest(root/'build/qualification-active-start-20261106-02/tsc-first.log'),'admissionSha256':digest(root/'build/qualification-active-start-20261106-03/source-fix-admission.json')}
save('preparation-first.json',record)
try:
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==admission['sourceCommit']=='011fcb44ef29d06557186a85d703a68575105169'
 assert build_files()==set(old['compiled']) and deps_files()==set(old['dependencies'])
 assert [len(old[k]) for k in ['compiled','dependencies','native','ownedSource','headerPins','externalRoutes','externalEntryPins']]==[186,395,48,128,36,5,7]
 for group in ['compiled','dependencies','native','ownedSource']:
  assert old[group]==admission[group]
  for name,value in old[group].items():exact(root/name,value)
 for name,pin in admission['newInputPins'].items():
  expected=hashlib.sha256(subprocess.check_output(['git','show',pin['commit']+':projects/temporal-datalog/runtime/'+name],cwd=root)).hexdigest();assert expected==pin['sha256'];exact(root/name,expected)
 for name,route in old['externalRoutes'].items():assert os.readlink(root/'node_modules'/name)==route['literalTarget'] and str((root/'node_modules'/name).resolve())==route['resolvedTarget']
 for name,entry in old['externalEntryPins'].items():assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 for entry in old['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 node=old['nodeExecutable']['file'];exact(Path(node),old['nodeExecutable']['sha256'])
 assert json.loads(subprocess.check_output([node,'--input-type=module','-e',resolve_js],cwd=root,text=True))==old['sdkResolution']
 duckdb=Path('[LOCAL_PATH_0041]')
 assert json.loads((duckdb/'.source-manifest.json').read_text())==old['sourceManifest']
 before={**old,'newInputPins':admission['newInputPins']};save('before-compile-first.json',before)
 command=[node,'[LOCAL_PATH_0044]','-p','tsconfig.json']
 terminal={'command':command,'startedAtUtc':stamp(),'sourceCommit':admission['sourceCommit']};record['stage']='corrected_source_TSC_once';save('preparation-first.json',record)
 with (log/'tsc-first.log').open('xb') as output:
  process=subprocess.Popen(command,cwd=root,stdout=output,stderr=subprocess.STDOUT);terminal['pid']=process.pid;save('tsc-first-terminal.json',terminal);print('TSC_CORRECTED_FIRST_PID',process.pid,flush=True);terminal['exitCode']=process.wait()
 terminal['endedAtUtc']=stamp();save('tsc-first-terminal.json',terminal);print('TSC_CORRECTED_FIRST_TERMINAL',json.dumps(terminal),flush=True)
 assert terminal['exitCode']==0,'Corrected source TSC failed; stop with no retry'
 record['stage']='old186_and_only_two_generated_outputs';save('preparation-first.json',record)
 compiled={name:exact(root/name,value) for name,value in old['compiled'].items()}
 generated={'build/adapter/test-native-writer-active-teardown.js','build/adapter/test-native-writer-active-teardown.d.ts'}
 assert build_files()==set(compiled)|generated,{'unexpected':sorted(build_files()-set(compiled)-generated),'missing':sorted(set(compiled)-build_files())}
 additions={name:digest(root/name) for name in generated}
 src=root/'adapter/native-writer-active-teardown-worker.mjs';dest=root/'build/adapter/native-writer-active-teardown-worker.mjs'
 with src.open('rb') as source,dest.open('xb') as target:shutil.copyfileobj(source,target)
 additions[str(dest.relative_to(root))]=exact(dest,admission['newInputPins']['adapter/native-writer-active-teardown-worker.mjs']['sha256'])
 final={**compiled,**additions};assert len(final)==189 and build_files()==set(final)
 for name,pin in old['dependencies'].items():exact(root/name,pin)
 assert deps_files()==set(old['dependencies'])
 for category in ['native','ownedSource']:
  for name,pin in old[category].items():exact(root/name,pin)
 for name,pin in admission['newInputPins'].items():exact(root/name,pin['sha256'])
 for name,route in old['externalRoutes'].items():assert os.readlink(root/'node_modules'/name)==route['literalTarget'] and str((root/'node_modules'/name).resolve())==route['resolvedTarget']
 for name,entry in old['externalEntryPins'].items():assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 for entry in old['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 exact(Path(node),old['nodeExecutable']['sha256']);assert json.loads(subprocess.check_output([node,'--input-type=module','-e',resolve_js],cwd=root,text=True))==old['sdkResolution']
 for category in ['compiled','dependencies']:
  for name,pin in old[category].items():exact(baseline/name,pin)
 exact(root/'build/qualification-active-start-20261106-02/tsc-first-terminal.json',record['priorTscTerminalSha256']);exact(root/'build/qualification-active-start-20261106-02/tsc-first.log',record['priorTscLogSha256'])
 physical={**final,**old['dependencies']};assert len(physical)==584
 after={**before,'compiled':final,'additions':additions,'physicalUnion':physical,'original186And395Unchanged':True,'allNative48AndSource128Unchanged':True,'priorFailedTscUnchanged':True}
 save('after-preparation-first.json',after)
 record.update(status='prepared_no_engine_test',stage='terminal',endedAtUtc=stamp(),compiledArtifactFiles=189,dependencyFiles=395,physicalFiles=584,additions=additions,original186And395Unchanged=True,allNative48AndSource128Unchanged=True,priorFailedTscUnchanged=True)
 save('preparation-first.json',record);print('CORRECTED_PREPARATION_PASS',json.dumps({'physicalFiles':584,'compiled':189,'dependencies':395,'additions':additions}),flush=True)
except BaseException as error:
 record.update(status='failed',endedAtUtc=stamp(),error={'name':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()});save('preparation-first.json',record);print('CORRECTED_PREPARATION_FAILURE',json.dumps(record['error']),flush=True);raise
