from pathlib import Path
import datetime,hashlib,json,os,shutil,subprocess,traceback
root=Path.cwd();baseline=Path('__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-writer-validation-20261106/runtime')
first=root/'build/qualification-active-start-20261106-01';log=Path(__file__).resolve().parent
old=json.loads((baseline/'evidence/native-writer-full512-20261106-raw/after-first.json').read_text())
code='4902695462c043cf68947d28170a65c8c5c9af71';protocol='f9a9874ac886f6b545947945010d8daeb3dc3da6';prefix='projects/temporal-datalog/runtime/'
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for data in iter(lambda:f.read(1048576),b''):h.update(data)
 return h.hexdigest()
def exact(path,value):
 actual=digest(path);assert actual==value,(str(path),actual,value);return actual
def save(name,value):
 (log/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def is_diagnostic(path):return path.is_relative_to(first) or path.is_relative_to(log)
def build_files():return {str(p.relative_to(root)) for p in (root/'build').rglob('*') if p.is_file() and not is_diagnostic(p)}
def dependency_files():return {str(p.relative_to(root)) for p in (root/'node_modules').rglob('*') if p.is_file() and not p.is_symlink()}
def union_maps(*maps):
 result={}
 for source in maps:
  for name,value in source.items():
   if name in result:assert result[name]==value
   result[name]=value
 return result
resolution_source="import {createRequire} from 'node:module';import {dirname,join} from 'node:path';import {realpathSync} from 'node:fs';const req=createRequire(process.cwd()+'/build/adapter/native-duckdb-port.mjs');const api=req.resolve('@duckdb/node-api');const bindings=createRequire(api).resolve('@duckdb/node-bindings');const platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');process.stdout.write(JSON.stringify({api,bindings,platform,engine:realpathSync(join(dirname(platform),'libduckdb.dylib')),nodeExecutable:realpathSync(process.execPath),nodeVersion:process.version}));"
record={'schema':'td.native-writer-active-start-preparation-repair/1','status':'running','startedAtUtc':stamp(),'pid':os.getpid(),'stage':'verify_existing581_no_recopy','repairDriverSha256':digest(Path(__file__)),'firstReceiptSha256':digest(first/'preparation-first.json'),'firstStdinTranscriptSha256':digest(first/'first.py'),'firstTranscriptProvenanceSha256':digest(first/'first-driver-provenance.json'),'addedRoutes':{}}
save('preparation-repair-first.json',record)
try:
 initial=json.loads((first/'preparation-first.json').read_text());assert initial['status']=='failed' and initial['error']['name']=='TypeError'
 assert not (first/'tsc-first-terminal.json').exists() and not (first/'before-compile-first.json').exists()
 assert [len(old[x]) for x in ['compiled','dependencies','native','ownedSource','externalRoutes','externalEntryPins','headerPins']]==[186,395,48,128,5,7,36]
 for section in ['compiled','dependencies','native','ownedSource']:
  assert all(isinstance(k,str) and isinstance(v,str) and len(v)==64 for k,v in old[section].items())
 for route in old['externalRoutes'].values():assert set(route)=={'literalTarget','resolvedTarget','use'} and all(isinstance(v,str) for v in route.values())
 for entry in old['externalEntryPins'].values():assert set(entry)=={'resolved','sha256'}
 for entry in old['headerPins'].values():assert set(entry)=={'file','sha256'}
 assert set(old['nodeExecutable'])=={'file','sha256'}
 union=union_maps(old['compiled'],old['dependencies']);assert len(union)==581 and initial['copied']==union
 assert build_files()==set(old['compiled']) and dependency_files()==set(old['dependencies'])
 for name,value in union.items():
  path=root/name;assert path.is_file() and not path.is_symlink();exact(path,value);exact(baseline/name,value)
 record['existing581Map']=union;save('preparation-repair-first.json',record)
 current=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();assert current==protocol
 gitbytes=lambda revision,name:subprocess.check_output(['git','show',revision+':'+prefix+name],cwd=root)
 accepted_doc='89b1bff1eb79f1447b1a231075c1258658728071b5000d031d39baf917b579e0';doc='NATIVE-WRITER-VALUES-QUALIFICATION.md'
 assert old['ownedSource'][doc]=='1580e8823a6dfb082027f7100ab3ae561e6a9570b352f6b78601b30aba0c1661'
 assert hashlib.sha256(gitbytes('51d4d0f738d6ca6a17413aaf218d2389d39f90f0',doc)).hexdigest()==accepted_doc
 source={name:exact(root/name,accepted_doc if name==doc else value) for name,value in old['ownedSource'].items()}
 native={name:exact(root/name,value) for name,value in old['native'].items()}
 inputs={}
 for name,revision in [('adapter/test-native-writer-active-teardown.ts',code),('adapter/native-writer-active-teardown-worker.mjs',code),('NATIVE-WRITER-ACTIVE-TEARDOWN.md',protocol)]:
  value=hashlib.sha256(gitbytes(revision,name)).hexdigest();inputs[name]={'commit':revision,'sha256':exact(root/name,value)}
 assert inputs==initial['newInputPins']
 record['stage']='add_only_five_absent_original_routes';record['sourceCommit']=current;record['newInputPins']=inputs;record['metadataException']=initial['metadataException'];save('preparation-repair-first.json',record)
 for name,route in old['externalRoutes'].items():
  original=baseline/'node_modules'/name;target=root/'node_modules'/name
  assert original.is_symlink() and os.readlink(original)==route['literalTarget'] and str(original.resolve())==route['resolvedTarget']
  assert not os.path.lexists(target),'Only ABSENT authorized route targets may be added'
 for name,route in old['externalRoutes'].items():
  target=root/'node_modules'/name;target.parent.mkdir(parents=True,exist_ok=True)
  os.symlink(route['literalTarget'],target);assert os.readlink(target)==route['literalTarget'] and str(target.resolve())==route['resolvedTarget']
  record['addedRoutes'][name]=route
 save('preparation-repair-first.json',record)
 for name,entry in old['externalEntryPins'].items():assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 node=old['nodeExecutable']['file'];exact(Path(node),old['nodeExecutable']['sha256'])
 for entry in old['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 duckdb=Path('[LOCAL_PATH_0041]');node_headers=Path(node).parent.parent/'include/node'
 assert json.loads((duckdb/'.source-manifest.json').read_text())==old['sourceManifest']
 resolution=json.loads(subprocess.check_output([node,'--input-type=module','-e',resolution_source],cwd=root,text=True))
 for name in ['api','bindings','platform','engine']:
  path=Path(resolution[name]);relative=str(path.relative_to(root));assert relative in old['dependencies'];exact(path,old['dependencies'][relative])
 assert resolution['nodeExecutable']==node and resolution['nodeVersion']==old['sdkResolution']['nodeVersion']
 core=json.loads((root/'build/artifact.json').read_text());owner=json.loads((root/'build/owner_probe/artifact.json').read_text())
 for key,path in [('extension_sha256','build/temporal_datalog.duckdb_extension'),('library_sha256','build/temporal_datalog.so'),('control_bridge_sha256','build/temporal_control.node')]:assert core[key]==union[path]
 assert owner['core_extension_sha256']==core['extension_sha256'] and owner['extension_sha256']==union['build/owner_probe/temporal_owner_probe.duckdb_extension'] and owner['library_sha256']==union['build/owner_probe/temporal_owner_probe.so']
 assert owner['native_writer']['addon_sha256']==union['build/owner_probe/temporal_writer.node'] and owner['native_writer']['abi']==1
 assert owner['native_writer']['node_executable_sha256']==old['nodeExecutable']['sha256'] and owner['native_writer']['node_version']==resolution['nodeVersion']
 assert owner['engine_library_sha256']==union['node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib'] and owner['source_archive_sha256']==old['sourceManifest']['archive_sha256']
 exact(duckdb/'LICENSE',owner['dependency_license_sha256'])
 for name,value in owner['headers_sha256'].items():exact(duckdb/'src/include'/name,value)
 for section in ['headers_sha256','uv_headers_sha256']:
  for name,value in owner['native_writer'][section].items():exact(node_headers/name,value)
 before={'compiled':{name:exact(root/name,value) for name,value in old['compiled'].items()},'dependencies':{name:exact(root/name,value) for name,value in old['dependencies'].items()},'native':native,'ownedSource':source,'newInputPins':inputs,'metadataException':record['metadataException'],'externalRoutes':old['externalRoutes'],'externalEntryPins':old['externalEntryPins'],'headerPins':old['headerPins'],'nodeExecutable':old['nodeExecutable'],'sourceManifest':old['sourceManifest'],'sdkResolution':resolution,'coreManifest':core,'ownerManifest':owner}
 save('before-compile-first.json',before);record['stage']='first_TSC';save('preparation-repair-first.json',record)
 command=[node,'[LOCAL_PATH_0044]','-p','tsconfig.json'];terminal={'command':command,'startedAtUtc':stamp()}
 with (log/'tsc-first.log').open('xb') as output:
  process=subprocess.Popen(command,cwd=root,stdout=output,stderr=subprocess.STDOUT);terminal['pid']=process.pid;save('tsc-first-terminal.json',terminal);print('TSC_FIRST_START_PID',process.pid,flush=True);terminal['exitCode']=process.wait()
 terminal['endedAtUtc']=stamp();save('tsc-first-terminal.json',terminal);print('TSC_FIRST_TERMINAL',json.dumps(terminal),flush=True)
 assert terminal['exitCode']==0,'Initial TSC failed; stop without retry'
 record['stage']='exact_compiled_delta_then_EXCL_worker_copy';save('preparation-repair-first.json',record)
 compiled={name:exact(root/name,value) for name,value in old['compiled'].items()}
 generated={'build/adapter/test-native-writer-active-teardown.js','build/adapter/test-native-writer-active-teardown.d.ts'}
 assert build_files()==set(compiled)|generated,{'unexpected':sorted(build_files()-set(compiled)-generated),'missing':sorted(set(compiled)-build_files())}
 additions={name:digest(root/name) for name in generated}
 src=root/'adapter/native-writer-active-teardown-worker.mjs';target=root/'build/adapter/native-writer-active-teardown-worker.mjs'
 with src.open('rb') as source_file,target.open('xb') as output:shutil.copyfileobj(source_file,output)
 additions[str(target.relative_to(root))]=exact(target,inputs['adapter/native-writer-active-teardown-worker.mjs']['sha256'])
 final=union_maps(compiled,additions);assert len(final)==189
 dependencies={name:exact(root/name,value) for name,value in before['dependencies'].items()};assert dependency_files()==set(dependencies)
 assert build_files()==set(final)
 native_after={name:exact(root/name,value) for name,value in before['native'].items()};source_after={name:exact(root/name,value) for name,value in before['ownedSource'].items()}
 for name,entry in inputs.items():exact(root/name,entry['sha256'])
 for name,route in old['externalRoutes'].items():assert os.readlink(root/'node_modules'/name)==route['literalTarget'] and str((root/'node_modules'/name).resolve())==route['resolvedTarget']
 for name,entry in old['externalEntryPins'].items():assert str((root/'node_modules'/name).resolve())==entry['resolved'];exact(root/'node_modules'/name,entry['sha256'])
 for entry in old['headerPins'].values():exact(Path(entry['file']),entry['sha256'])
 exact(Path(node),old['nodeExecutable']['sha256']);assert json.loads(subprocess.check_output([node,'--input-type=module','-e',resolution_source],cwd=root,text=True))==resolution
 for name,value in union.items():exact(baseline/name,value)
 exact(first/'preparation-first.json',record['firstReceiptSha256']);exact(first/'first.py',record['firstStdinTranscriptSha256'])
 physical=union_maps(final,dependencies);assert len(physical)==584
 after={**before,'compiled':final,'dependencies':dependencies,'native':native_after,'ownedSource':source_after,'additions':additions,'physicalUnion':physical,'originalA581Unchanged':True,'firstFailureReceiptUnchanged':True}
 save('after-preparation-first.json',after)
 record.update(status='prepared_no_engine_test',stage='terminal',endedAtUtc=stamp(),compiledArtifactFiles=189,dependencyFiles=395,physicalFiles=584,allOriginal186Unchanged=True,onlyThreeAdditions=additions,originalA581Unchanged=True,firstFailureReceiptUnchanged=True)
 save('preparation-repair-first.json',record);print('PREPARATION_REPAIR_FIRST_PASS',json.dumps({'physicalFiles':584,'compiledArtifactFiles':189,'dependencyFiles':395,'additions':additions}),flush=True)
except BaseException as error:
 record.update(status='failed',endedAtUtc=stamp(),error={'name':type(error).__name__,'message':str(error),'traceback':traceback.format_exc()});save('preparation-repair-first.json',record)
 print('PREPARATION_REPAIR_FIRST_FAILURE',json.dumps(record['error']),flush=True);raise
