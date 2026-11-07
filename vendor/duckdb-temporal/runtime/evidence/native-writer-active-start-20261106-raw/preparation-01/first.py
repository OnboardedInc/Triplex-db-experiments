from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,traceback
root=Path.cwd();baseline=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-validation-20261106/runtime')
map_path=baseline/'evidence/native-writer-full512-20261106-raw/after-first.json'
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for data in iter(lambda:f.read(1048576),b''):h.update(data)
 return h.hexdigest()
def exact(path,expected):
 value=digest(path);assert value==expected,(str(path),value,expected);return value
def save(name,value):
 (log/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
assert not os.path.lexists(root/'build'),'Owned build must be absent; no repair/overwrite authorized'
assert not os.path.lexists(root/'node_modules'),'Owned node_modules must be absent; no repair/overwrite authorized'
(root/'build').mkdir();log=root/'build/qualification-active-start-20261106-01';log.mkdir()
record={'schema':'td.native-writer-active-start-preparation/1','status':'running','startedAtUtc':stamp(),'pid':os.getpid(),'baseline':str(baseline),'baselineMap':str(map_path),'copied':{},'stage':'source_and_copy_preflight'}
save('preparation-first.json',record)
try:
 old=json.loads(map_path.read_text());code='4902695462c043cf68947d28170a65c8c5c9af71';protocol='f9a9874ac886f6b545947945010d8daeb3dc3da6';repo=root.parents[2];prefix='projects/temporal-datalog/runtime/'
 current=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();assert current==protocol
 gitbytes=lambda revision,name:subprocess.check_output(['git','show',revision+':'+prefix+name],cwd=root)
 assert len(old['compiled'])==186 and len(old['dependencies'])==395 and len(old['native'])==48 and len(old['ownedSource'])==128
 exception_name='NATIVE-WRITER-VALUES-QUALIFICATION.md';old_doc='1580e8823a6dfb082027f7100ab3ae561e6a9570b352f6b78601b30aba0c1661';accepted_doc='89b1bff1eb79f1447b1a231075c1258658728071b5000d031d39baf917b579e0'
 assert old['ownedSource'][exception_name]==old_doc
 source={}
 for name,expected in old['ownedSource'].items():
  if name==exception_name:
   assert hashlib.sha256(gitbytes('51d4d0f738d6ca6a17413aaf218d2389d39f90f0',name)).hexdigest()==accepted_doc;expected=accepted_doc
  source[name]=exact(root/name,expected)
 native={name:exact(root/name,value) for name,value in old['native'].items()}
 inputs={}
 for name,revision in [('adapter/test-native-writer-active-teardown.ts',code),('adapter/native-writer-active-teardown-worker.mjs',code),('NATIVE-WRITER-ACTIVE-TEARDOWN.md',protocol)]:
  expected=hashlib.sha256(gitbytes(revision,name)).hexdigest();inputs[name]={'commit':revision,'sha256':exact(root/name,expected)}
 union={}
 for category in ['compiled','dependencies']:
  for name,value in old[category].items():
   if name in union:assert union[name]==value
   union[name]=value
 assert len(union)==581
 for name,value in union.items():
  src=baseline/name;assert src.is_file() and not src.is_symlink();exact(src,value)
  target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
  with src.open('rb') as source_file,target.open('xb') as target_file:shutil.copyfileobj(source_file,target_file)
  exact(target,value);record['copied'][name]=value
 record['baselinePhysicalFiles']=len(union);record['baselineCompiledArtifacts']=186;record['dependencyFiles']=395
 record['metadataException']={'path':exception_name,'testedSha256':old_doc,'acceptedSha256':accepted_doc,'gitCommit':'51d4d0f738d6ca6a17413aaf218d2389d39f90f0'}
 record['sourceCommit']=current;record['newInputPins']=inputs;record['stage']='external_dependency_and_resolution_preflight';save('preparation-first.json',record)
 for name,target in old['externalRoutes'].items():
  path=root/'node_modules'/name;path.parent.mkdir(parents=True,exist_ok=True)
  assert not os.path.lexists(path);os.symlink(target,path)
  assert str(path.resolve())==target,(name,str(path.resolve()),target)
 for name,entry in old['externalEntryPins'].items():
  assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 node=old['nodeExecutable']['file'];exact(Path(node),old['nodeExecutable']['sha256'])
 for entry in old['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 manifest=old['sourceManifest'];pinned_source=Path('[LOCAL_PATH_0041]')
 assert json.loads((pinned_source/'.source-manifest.json').read_text())==manifest
 resolution_source="import {createRequire} from 'node:module';import {dirname,join} from 'node:path';import {realpathSync} from 'node:fs';const req=createRequire(process.cwd()+'/build/adapter/native-duckdb-port.mjs');const api=req.resolve('@duckdb/node-api');const bindings=createRequire(api).resolve('@duckdb/node-bindings');const platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');process.stdout.write(JSON.stringify({api,bindings,platform,engine:realpathSync(join(dirname(platform),'libduckdb.dylib')),nodeExecutable:realpathSync(process.execPath),nodeVersion:process.version}));"
 resolution=json.loads(subprocess.check_output([node,'--input-type=module','-e',resolution_source],cwd=root,text=True))
 for name in ['api','bindings','platform','engine']:
  path=Path(resolution[name]);relative=str(path.relative_to(root));assert relative in old['dependencies'];exact(path,old['dependencies'][relative])
 assert resolution['nodeExecutable']==node and resolution['nodeVersion']==old['sdkResolution']['nodeVersion']
 core=json.loads((root/'build/artifact.json').read_text());owner=json.loads((root/'build/owner_probe/artifact.json').read_text())
 assert core['extension_sha256']==old['compiled']['build/temporal_datalog.duckdb_extension']==owner['core_extension_sha256']
 assert owner['extension_sha256']==old['compiled']['build/owner_probe/temporal_owner_probe.duckdb_extension']
 assert owner['native_writer']['addon_sha256']==old['compiled']['build/owner_probe/temporal_writer.node']
 assert owner['engine_library_sha256']==old['dependencies']['node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib']
 assert owner['native_writer']['node_executable_sha256']==old['nodeExecutable']['sha256'] and owner['native_writer']['abi']==1
 before={'compiled':{name:exact(root/name,value) for name,value in old['compiled'].items()},'dependencies':{name:exact(root/name,value) for name,value in old['dependencies'].items()},'native':native,'ownedSource':source,'newInputPins':inputs,'metadataException':record['metadataException'],'externalRoutes':old['externalRoutes'],'externalEntryPins':old['externalEntryPins'],'headerPins':old['headerPins'],'nodeExecutable':old['nodeExecutable'],'sdkResolution':resolution,'coreManifest':core,'ownerManifest':owner}
 save('before-compile-first.json',before)
 record['stage']='tsc';record['resolution']=resolution;save('preparation-first.json',record)
 command=[node,'[LOCAL_PATH_0044]','-p','tsconfig.json']
 terminal={'command':command,'startedAtUtc':stamp()}
 with (log/'tsc-first.log').open('xb') as out:
  process=subprocess.Popen(command,cwd=root,stdout=out,stderr=subprocess.STDOUT);terminal['pid']=process.pid;save('tsc-first-terminal.json',terminal);print('TSC_FIRST_START_PID',process.pid,flush=True);terminal['exitCode']=process.wait()
 terminal['endedAtUtc']=stamp();save('tsc-first-terminal.json',terminal);print('TSC_FIRST_TERMINAL',json.dumps(terminal),flush=True)
 assert terminal['exitCode']==0,'Initial TSC failed; no retry authorized'
 record['stage']='post_tsc_map_and_worker_exclusive_copy';save('preparation-first.json',record)
 post_compiled={name:exact(root/name,value) for name,value in old['compiled'].items()}
 expected_new=['build/adapter/test-native-writer-active-teardown.js','build/adapter/test-native-writer-active-teardown.d.ts']
 baseline_build={name for name in old['compiled'] if name.startswith('build/')}
 actual_build={str(path.relative_to(root)) for path in (root/'build').rglob('*') if path.is_file() and not path.is_relative_to(log)}
 assert actual_build==baseline_build|set(expected_new),{'unexpected':sorted(actual_build-baseline_build-set(expected_new)),'missing':sorted(baseline_build-set(actual_build))}
 additions={name:digest(root/name) for name in expected_new}
 worker='build/adapter/native-writer-active-teardown-worker.mjs';src=root/'adapter/native-writer-active-teardown-worker.mjs';target=root/worker
 with src.open('rb') as source_file,target.open('xb') as target_file:shutil.copyfileobj(source_file,target_file)
 additions[worker]=exact(target,inputs['adapter/native-writer-active-teardown-worker.mjs']['sha256'])
 final={**post_compiled,**additions};assert len(final)==189
 dependencies={name:exact(root/name,value) for name,value in old['dependencies'].items()}
 native_after={name:exact(root/name,value) for name,value in before['native'].items()}
 sources_after={name:exact(root/name,value) for name,value in before['ownedSource'].items()}
 for name,value in inputs.items():exact(root/name,value['sha256'])
 for name,target in before['externalRoutes'].items():assert str((root/'node_modules'/name).resolve())==target
 for name,entry in before['externalEntryPins'].items():assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 for entry in before['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 exact(Path(node),before['nodeExecutable']['sha256'])
 assert json.loads(subprocess.check_output([node,'--input-type=module','-e',resolution_source],cwd=root,text=True))==resolution
 for name,value in union.items():exact(baseline/name,value)
 final_physical={**final,**dependencies};assert len(final_physical)==584
 actual_build={str(path.relative_to(root)) for path in (root/'build').rglob('*') if path.is_file() and not path.is_relative_to(log)}
 assert actual_build=={name for name in final if name.startswith('build/')}
 actual_dependencies={str(path.relative_to(root)) for path in (root/'node_modules').rglob('*') if path.is_file() and not path.is_symlink()}
 assert actual_dependencies==set(dependencies),{'unexpected':sorted(actual_dependencies-set(dependencies)),'missing':sorted(set(dependencies)-actual_dependencies)}
 after={**before,'compiled':final,'dependencies':dependencies,'native':native_after,'ownedSource':sources_after,'additions':additions,'physicalUnion':final_physical,'originalBaselineUnchanged':True}
 save('after-preparation-first.json',after)
 record.update(status='prepared_no_engine_test',stage='terminal',endedAtUtc=stamp(),compiledArtifactFiles=189,dependencyFiles=395,physicalFiles=584,additions=additions,allOriginal186Unchanged=True,baselineSourceUnchanged=True)
 save('preparation-first.json',record);print('PREPARATION_FIRST_PASS',json.dumps({'physicalFiles':584,'compiledArtifactFiles':189,'dependencyFiles':395,'additions':additions}),flush=True)
except BaseException as error:
 record.update(status='failed',endedAtUtc=stamp(),error={'name':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()});save('preparation-first.json',record)
 print('PREPARATION_FIRST_FAILURE',json.dumps(record['error']),flush=True);raise
