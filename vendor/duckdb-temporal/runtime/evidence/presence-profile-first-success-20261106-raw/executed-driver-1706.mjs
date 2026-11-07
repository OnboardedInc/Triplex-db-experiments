// Diagnostic only: source-authored after the independent five-method gate.
// No measured service comparison, alternate endpoint or SQL-emitter replica.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstat,mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const approved={core:'2f7f6c0eb20132d17511dfb531cf90fa00d549ea8451e1d5e30b9f08d45c4e70',
  owner:'109a16b2d42015fca92b949b28229c3b1dd17aba98e2de0076a2d9016bd9e522',
  engine:'72b50268165284d321ec0263b39fafa9551379e72558e443d4b4f1eeb4f4042c'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,(_,item)=>typeof item==='bigint'?String(item):item,2)+'\n';
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const save=(path,value)=>writeFile(path,json(value),{flag:'wx'});
const optional=async path=>{try{return await readFile(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const options={};
for(let i=2;i<process.argv.length;i+=2){
  const name=process.argv[i]?.slice(2);assert.ok(['runtime','output'].includes(name)&&process.argv[i+1]);
  assert.equal(options[name],undefined);options[name]=process.argv[i+1];
}
assert.ok(options.runtime&&options.output);assert.equal(process.version,'v24.13.0');
assert.equal(process.env.UV_THREADPOOL_SIZE,'4');assert.equal(process.env.NODE_OPTIONS??'','');
const runtime=await realpath(options.runtime),output=resolve(options.output);
assert.ok(output.startsWith(join(sourceRoot,'build')+'/'),'Use a fresh owned build capture');
await mkdir(join(sourceRoot,'build'),{recursive:true});await mkdir(output);
const database=join(output,'facts.duckdb'),report={schema:'td.presence-profile/1',status:'running',pid:process.pid,
  argv:[...process.argv],runtime,output,database,startedAtUtc:new Date().toISOString(),cells:[],
  scope:'Fresh synthetic raw-owned presence endpoint diagnostic; profiling overhead is not service latency.',
  unmeasured:['C++ PRAGMA emission phase','exclusive DuckDB-versus-host time','whole-process allocation containment']};
await save(join(output,'started.json'),report);
let instance,connection;
async function identity(){
  const coreBytes=await readFile(join(runtime,'build/artifact.json'));
  const ownerBytes=await readFile(join(runtime,'build/owner_probe/artifact.json'));
  const core=JSON.parse(coreBytes),owner=JSON.parse(ownerBytes);
  assert.equal(core.extension_sha256,approved.core);assert.equal(owner.extension_sha256,approved.owner);
  assert.equal(owner.core_extension_sha256,approved.core);assert.equal(owner.engine_library_sha256,approved.engine);
  const require=createRequire(join(runtime,'build/adapter/native-duckdb-port.mjs'));
  const api=require.resolve('@duckdb/node-api'),bindings=createRequire(api).resolve('@duckdb/node-bindings');
  const platform=createRequire(bindings).resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node');
  const engine=join(dirname(platform),'libduckdb.dylib');
  const files={core:join(runtime,'build/temporal_datalog.duckdb_extension'),
    owner:join(runtime,'build/owner_probe/temporal_owner_probe.duckdb_extension'),engine};
  const pins={};for(const [name,path]of Object.entries(files)){
    assert.equal(await realpath(path),path);pins[name]=hash(await readFile(path));assert.equal(pins[name],approved[name]);
  }
  return {api,bindings,platform,engine,pins,coreManifestSha256:hash(coreBytes),ownerManifestSha256:hash(ownerBytes),
    driverSha256:hash(await readFile(fileURLToPath(import.meta.url)))};
}
const rows=async statement=>(await connection.runAndReadAll(statement)).getRows();
function operators(node,path='operator',result=[]){
  assert.ok(node&&typeof node==='object');assert.equal(typeof node.type,'string');assert.ok(node.type.length);
  result.push({path,type:node.type,timing:node.timing??null,intermediate_rows:node.intermediate_rows??null,
    intermediate_size_bytes:node.intermediate_size_bytes??null,rows_scanned:node.rows_scanned??null,
    row_groups_scanned:node.row_groups_scanned??null,total_row_groups_to_scan:node.total_row_groups_to_scan??null,
    extra_info:node.extra_info??null});
  if(Array.isArray(node.children))node.children.forEach((child,index)=>operators(child,path+'.'+index,result));
  return result;
}
async function profile(id,k,events,expected){
  const stem=join(output,id),automatic=stem+'.automatic.json';
  await assert.rejects(lstat(automatic),{code:'ENOENT'});
  // Settings can themselves be profiled under ALL. Preserve the pre-target
  // observation so an unchanged settings profile cannot masquerade as a read.
  await rows('PRAGMA disable_profiling');
  await rows("SET profiling_coverage='ALL'");
  await rows("SET enable_profiling='json'");
  await rows('SET profiling_output='+quote(automatic));
  const before=await optional(automatic);
  if(before)await writeFile(stem+'.before-target.json',before,{flag:'wx'});
  const statement=`PRAGMA td_entity_presence_intervals_v1(${quote(id)},${k},${events},8,1048576)`;
  const cell={id,statement,expected,limits:{maxEvents:events,maxIntervals:8,maxResultBytes:1048576},
    profileAssociation:'Observed immediately after full fetch; no intervening SQL. Inspect actual query.sql, including rewrite.',
    beforeTargetProfileSha256:before?hash(before):null};
  report.cells.push(cell);
  let queryError,captureError,disableError,actual,columns,observed;
  const start=performance.now();
  try{
    const reader=await connection.runAndReadAll(statement);actual=reader.getRows();columns=reader.columnNames();
    cell.fullFetchWithProfilingMs=performance.now()-start;
  }catch(error){queryError=error;cell.queryError={name:error.name,message:error.message};}
  // File I/O only until the exact observed bytes have been retained. Disable may
  // overwrite the automatic file; this separate EXCL snapshot remains intact.
  try{observed=await optional(automatic);if(observed)await writeFile(stem+'.after-target.json',observed,{flag:'wx'});}
  catch(error){captureError=error;cell.profileCaptureError={name:error.name,message:error.message};}
  finally{try{await rows('PRAGMA disable_profiling');}
    catch(error){disableError=error;cell.profilingDisableError={name:error.name,message:error.message};}}
  cell.actual=actual??null;cell.columns=columns??null;cell.profileBytes=observed?.length??0;
  cell.afterTargetProfileSha256=observed?hash(observed):null;
  if(queryError)throw queryError;
  if(captureError)throw captureError;if(disableError)throw disableError;
  assert.deepEqual(columns,['entity_id','known_at','has_edit_at_cut','valid_from','valid_to']);assert.deepEqual(actual,expected);
  assert.ok(observed,'No JSON file observed after this fully fetched PRAGMA; do not substitute another query');
  assert.ok(!before||!observed.equals(before),'Only an unchanged settings profile was observed');
  // The pinned engine's observed JSON schema is nested: query.sql and
  // operator[]. Keep its native field names; intermediate_rows is not relabeled
  // as output cardinality, and timing is not subtracted from full-call time.
  const parsed=JSON.parse(observed);cell.profileSchema='pinned-duckdb-nested-query-operator';
  cell.querySql=parsed.query?.sql??null;
  assert.equal(typeof cell.querySql,'string');assert.ok(cell.querySql.length);
  const rawEndpoint=/^\s*PRAGMA\s+td_entity_presence_intervals_v1\s*\(/i.test(cell.querySql);
  const generatedPresence=/^\s*WITH\b/i.test(cell.querySql)&&
    /\bpresence_owner\b"?\s+AS\b/i.test(cell.querySql)&&/\bpresence_scoped\b"?\s+AS\b/i.test(cell.querySql);
  cell.queryTextClassification=rawEndpoint?'raw_endpoint':generatedPresence?'generated_presence_ctes':'unrecognized';
  assert.ok(rawEndpoint||generatedPresence,'Observed JSON does not name the raw endpoint or its generated presence CTEs');
  cell.metrics={query:Object.fromEntries(['total_time','cpu_time','total_intermediate_rows','total_intermediate_size_bytes',
    'total_rows_scanned','total_row_groups_scanned','total_row_groups_to_scan'].map(name=>[name,parsed.query?.[name]??null])),
    system:parsed.system??null};
  assert.ok(Array.isArray(parsed.operator)&&parsed.operator.length,'JSON has no observed physical operators');
  cell.operators=parsed.operator.flatMap((node,index)=>operators(node,'operator.'+index));
  await save(stem+'.observation.json',cell);
}
try{
  report.before=await identity();
  const {DuckDBInstance}=await import(pathToFileURL(report.before.api).href);
  instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1',
    memory_limit:'128MB',max_temp_directory_size:'64MB'});connection=await instance.connect();
  // Match the actual first-pass independent fixture: load both before the
  // initializer/migration can bind their owned guard functions.
  for(const name of ['temporal_datalog.duckdb_extension','owner_probe/temporal_owner_probe.duckdb_extension'])
    await rows('LOAD '+quote(join(runtime,'build',name)));
  await rows('PRAGMA td_initialize');
  if(!(await rows('SELECT revision FROM td_catalog_v1.catalog_revision WHERE singleton')).length)
    await rows('PRAGMA td_migrate_native_catalog_v2');
  await rows('SELECT system.main.td_owner_probe_enroll()');await rows('SELECT system.main.td_owner_probe_activate(0)');
  await rows("PRAGMA td_define_schema_v2('schema profile_presence version 1 {entity Row live {label:text;}}')");
  let ordinal=0;
  const edit=async(id,operation,lo,hi)=>{
    const name=operation==='put'?'td_put_entity_v2':'td_patch_entity_v2';
    return rows(`PRAGMA ${name}('profile_presence',1,'Row',${quote(id)},'profile-${ordinal++}','{}',${lo},${hi})`);
  };
  for(const [op,lo,hi]of [['put',0,10],['patch',2,3],['patch',4,5],['patch',10,12],['patch',11,20]])
    await edit('nested',op,lo,hi);
  await edit('reset','put',-8,-2);await edit('reset','patch',20,30);
  for(let i=0;i<8;i++)await edit('unrelated','patch',100+i*2,101+i*2);
  for(let i=0;i<2;i++){
    const members=[{operation:i?'patch':'put',type:'Row',entityId:'reset',record:'{}',validFrom:i?'8':'4',validTo:i?'10':'6'},
      {operation:'patch',type:'Row',entityId:'batch-unrelated',record:'{}',validFrom:String(200+i*2),validTo:String(201+i*2)}];
    await rows(`PRAGMA td_batch_entities${i?'':'_initial'}('profile_presence',1,'profile-batch-${i}',${quote(JSON.stringify(members))})`);
  }
  const k=(await rows('SELECT position FROM main.clock'))[0]?.[0];assert.equal(typeof k,'bigint');
  report.settings=(await rows("SELECT current_setting('threads'),current_setting('memory_limit'),current_setting('max_temp_directory_size')"))[0];
  report.authored={knownAt:k,targets:{nested:{visibleEvents:5,expected:[[0n,20n]]},reset:{visibleEvents:4,expected:[[4n,6n],[8n,10n]]},missing:{visibleEvents:0,expected:[]}},unrelatedEvents:10};
  await profile('nested',k,5,[['nested',k,true,0n,20n]]);
  await profile('reset',k,4,[['reset',k,true,4n,6n],['reset',k,true,8n,10n]]);
  await profile('missing',k,1,[['missing',k,false,null,null]]);
  report.after=await identity();assert.deepEqual(report.after,report.before);report.status='passed_diagnostic_only';
}catch(error){report.status='failed';report.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
  const cleanup=[];
  for(const retire of [()=>connection?.closeSync(),()=>instance?.closeSync()])try{retire();}
    catch(error){cleanup.push({name:error.name,message:error.message});}
  if(cleanup.length){report.cleanupErrors=cleanup;report.status='failed';process.exitCode=1;}
  try{
    const file=await lstat(database);assert.ok(file.isFile()&&!file.isSymbolicLink());
    await assert.rejects(lstat(database+'.wal'),{code:'ENOENT'});
    report.closedWithoutWal=cleanup.length===0;report.databaseBytes=file.size;
  }catch(error){report.databaseCloseObservationError={name:error.name,message:error.message};report.status='failed';process.exitCode=1;}
  report.finishedAtUtc=new Date().toISOString();await save(join(output,'result-first.json'),report);
}
