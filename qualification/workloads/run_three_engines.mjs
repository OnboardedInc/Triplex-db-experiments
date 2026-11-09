// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing; Node accepts URL objects for dynamic import; TypeScript expects strings. Binding errors remain checked by lab/bin/checkjs.mjs.
// Bounded workload execution. Every database and failed receipt is retained.
import assert from 'node:assert/strict';
import {ingestWebhookDeliveries,initializeWebhookProjection,verifyWebhookReopen} from './webhook_cases.mjs';
import {appendDependencyProjection,initializeDependencyProjection} from './dependency_cases.mjs';
import {appendTrainingProjection,initializeTrainingProjection} from './training_cases.mjs';
import {appendUptimeProjection,uptimeDuration} from './uptime_cases.mjs';
import {appendContainmentProjection} from './containment_cases.mjs';
import {appendSupportProjection,initializeSupportProjection} from './support_cases.mjs';
import {appendIntervalJoinProjection,initializeIntervalJoinProjection} from './interval_join_cases.mjs';
import {appendRecallProjection,initializeRecallProjection} from './recall_cases.mjs';
import {appendFunnelProjection,initializeFunnelProjection} from './funnel_cases.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {basename,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {quantiles} from '../adapter/scale-fixture.mjs';
import {assertAnswer,casePlan,completeRows,eventGroups,infinity,nativeWrite,positionAt,schemaFor,supportedWorkloads,wireRows} from './engine_cases.mjs';
import {accessWorkloads,appendAccessProjection} from './access_cases.mjs';

const ownRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const serialize=value=>JSON.stringify(value,(_,cell)=>typeof cell==='bigint'?String(cell):cell,2)+'\n';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reportRoots=[ownRoot];
const errorRecord=error=>({name:error.name,code:error.code??null,
  message:reportRoots.reduce((message,path)=>message.replaceAll(path,'<runtime>'),String(error.message))});

export function parseOptions(args) {
  const options={runtime:ownRoot,output:null,workloads:[...supportedWorkloads],samples:5,warmup:1,
    threads:1,memoryLimit:'128MB',maxTempDirectorySize:'64MB',python:'python3'};
  const names={'memory-limit':'memoryLimit','max-temp-directory-size':'maxTempDirectorySize'};
  for (let index=0;index<args.length;index++) {
    const name=names[args[index].slice(2)]??args[index].slice(2),value=args[++index];
    assert.ok(args[index-1].startsWith('--') && Object.hasOwn(options,name) && value && !value.startsWith('--'),'Invalid option');
    options[name]=name==='workloads'?value.split(','):['samples','warmup','threads'].includes(name)?Number(value):value;
  }
  assert.ok(options.output,'Fresh output path is required');
  assert.ok(options.workloads.length && new Set(options.workloads).size===options.workloads.length &&
    options.workloads.every(id=>supportedWorkloads.includes(id)),'Only implemented workloads may be selected');
  for (const key of ['samples','threads']) assert.ok(Number.isSafeInteger(options[key])&&options[key]>0,'Invalid '+key);
  assert.ok(Number.isSafeInteger(options.warmup)&&options.warmup>=0,'Invalid warmup');
  return options;
}

async function sqlEngine(DuckDBInstance,database,options) {
  const instance=await DuckDBInstance.create(database,{threads:String(options.threads),
    memory_limit:options.memoryLimit,max_temp_directory_size:options.maxTempDirectorySize});
  let connection;
  try {connection=await instance.connect();} catch (error) {instance.closeSync();throw error;}
  const prepared=new Map();
  let closed=false;
  const run=async(sql,params=[])=>{
    let statement=prepared.get(sql);
    if (!statement) {statement=await connection.prepare(sql);prepared.set(sql,statement);}
    statement.clearBindings();statement.bind(params);
    return (await statement.runAndReadAll()).getRows();
  };
  return {run,async close(){
    if (closed) return;
    closed=true;
    const errors=[];
    for (const statement of prepared.values()) try {statement.destroySync();} catch (error) {errors.push(error);}
    try {connection.closeSync();} catch (error) {errors.push(error);}
    try {instance.closeSync();} catch (error) {errors.push(error);}
    if (errors.length) throw new AggregateError(errors,'SQL fixture cleanup failed');
  }};
}

async function initializeSQL(engine,profile,workload) {
  if (profile==='naive_sql') {
    await engine.run(`CREATE TABLE source_event(event_id VARCHAR PRIMARY KEY,
      subject VARCHAR,kind VARCHAR,occurred_at BIGINT,recorded_at BIGINT,semantics VARCHAR,corrects VARCHAR,payload JSON)`);
    if(workload.id==='05')await initializeWebhookProjection(engine,profile);
  } else if(workload.id==='05') {
    await initializeWebhookProjection(engine,profile);
  } else if(workload.id==='15') {
    await initializeDependencyProjection(engine);
  } else if (workload.id==='01'||workload.id==='02') {
    await engine.run(`CREATE TABLE state_history(entity VARCHAR,value VARCHAR,valid_from BIGINT,valid_to BIGINT,
      known_from BIGINT,known_to BIGINT,source_event VARCHAR)`);
  } else if (workload.id==='03'||workload.id==='04') {
    await initializeIntervalJoinProjection(engine,workload);
  } else if (workload.id==='06') {
    await engine.run('CREATE TABLE posting(event_id VARCHAR PRIMARY KEY,account VARCHAR,amount BIGINT,currency VARCHAR,valid_from BIGINT,known_from BIGINT,reverses VARCHAR)');
  } else if (workload.id==='07') {
    await engine.run('CREATE TABLE movement(event_id VARCHAR PRIMARY KEY,sku VARCHAR,ledger VARCHAR,delta BIGINT,valid_from BIGINT,known_from BIGINT)');
  } else if (workload.id==='08') {
    await engine.run('CREATE TABLE capture(event_id VARCHAR PRIMARY KEY,customer VARCHAR,currency VARCHAR,amount BIGINT,valid_from BIGINT,known_from BIGINT)');
    await engine.run('CREATE TABLE refund(event_id VARCHAR PRIMARY KEY,capture_id VARCHAR,currency VARCHAR,amount BIGINT,valid_from BIGINT,known_from BIGINT)');
  } else if (workload.id==='14') {
    await initializeRecallProjection(engine);
  } else if (workload.id==='17') {
    await initializeFunnelProjection(engine);
  } else if (workload.id==='20') {
    await initializeSupportProjection(engine,workload);
  } else if (workload.id==='19') {
    await initializeTrainingProjection(engine);
  } else if (workload.id==='18') {
    await engine.run('CREATE TABLE uptime_observation(event_id VARCHAR PRIMARY KEY,machine VARCHAR,valid_from BIGINT,valid_to BIGINT,known_from BIGINT)');
  } else if (workload.id==='13') {
    await engine.run('CREATE TABLE containment_edge(parent VARCHAR,child VARCHAR,valid_from BIGINT,valid_to BIGINT,known_from BIGINT,known_to BIGINT)');
  } else if (workload.id==='16') {
    await engine.run('CREATE TABLE run_version(event_id VARCHAR PRIMARY KEY,run_id VARCHAR,dataset VARCHAR,version BIGINT,valid_from BIGINT,known_from BIGINT)');
    await engine.run('CREATE TABLE run_input(event_id VARCHAR,run_id VARCHAR,input VARCHAR,valid_from BIGINT,known_from BIGINT)');
  } else if (workload.id==='09') {
    await engine.run('CREATE TABLE payment(event_id VARCHAR PRIMARY KEY,subscription VARCHAR,paid BOOLEAN,valid_from BIGINT,known_from BIGINT)');
    await engine.run('CREATE TABLE entitlement(event_id VARCHAR PRIMARY KEY,subscription VARCHAR,entitled BOOLEAN,valid_from BIGINT,known_from BIGINT)');
  } else if (accessWorkloads.includes(workload.id)) {
    await engine.run(`CREATE TABLE access_edge(event_id VARCHAR,ordinal INTEGER,kind VARCHAR,subject VARCHAR,target VARCHAR,
      principal VARCHAR,valid_from BIGINT,valid_to BIGINT,known_from BIGINT,known_to BIGINT,PRIMARY KEY(event_id,ordinal))`);
  } else {
    assert.equal(workload.id,'10');
    await engine.run('CREATE TABLE workflow_start(event_id VARCHAR PRIMARY KEY,workflow VARCHAR,feed VARCHAR,deadline BIGINT,valid_from BIGINT,known_from BIGINT)');
    await engine.run('CREATE TABLE terminal_completion(event_id VARCHAR PRIMARY KEY,workflow VARCHAR,feed VARCHAR,completed_at BIGINT,valid_from BIGINT,known_from BIGINT)');
    await engine.run('CREATE TABLE terminal_watermark(event_id VARCHAR PRIMARY KEY,feed VARCHAR,through_at BIGINT,observed_at BIGINT,known_from BIGINT)');
  }
}

async function appendSQL(engine,profile,workload,event) {
  const valid=BigInt(event.occurred_at),known=BigInt(event.recorded_at),p=event.payload;
  if (profile==='naive_sql') {
    await engine.run('INSERT INTO source_event VALUES (?,?,?,?,?,?,?,?)',
      [event.id,event.subject,event.kind,valid,known,event.semantics,event.corrects??null,JSON.stringify(p)]);
  } else if (workload.id==='01'||workload.id==='02') {
    const old=await engine.run('UPDATE state_history SET known_to=? WHERE entity=? AND known_to=? RETURNING entity,value,valid_from,valid_to,source_event',
      [known,event.subject,infinity]);
    for (const [entity,value,start,end,source] of old) if (start<valid) {
      await engine.run('INSERT INTO state_history VALUES (?,?,?,?,?,?,?)',[entity,value,start,end<valid?end:valid,known,infinity,source]);
    }
    const attribute=workload.id==='01'?'status':'address';
    await engine.run('INSERT INTO state_history VALUES (?,?,?,?,?,?,?)',[event.subject,p[attribute].value,valid,infinity,known,infinity,event.id]);
  } else if (workload.id==='03'||workload.id==='04') {
    await appendIntervalJoinProjection(engine,workload,event);
  } else if (workload.id==='06') await engine.run('INSERT INTO posting VALUES (?,?,?,?,?,?,?)',
    [event.id,p.account.value,BigInt(p.amount.value),p.currency.value,valid,known,p.reverses?.value??null]);
  else if (workload.id==='07') await engine.run('INSERT INTO movement VALUES (?,?,?,?,?,?)',
    [event.id,p.sku.value,p.ledger.value,BigInt(p.delta.value),valid,known]);
  else if (workload.id==='09') {
    if(event.kind==='payment')await engine.run('INSERT INTO payment VALUES (?,?,?,?,?)',
      [event.id,p.subscription.value,p.paid.value,valid,known]);
    else {
      assert.equal(event.kind,'entitlement');
      await engine.run('INSERT INTO entitlement VALUES (?,?,?,?,?)',[event.id,event.subject,p.entitled.value,valid,known]);
    }
  } else if (workload.id==='08') {
    const args=[event.id,(p.customer??p.capture).value,p.currency.value,BigInt(p.amount.value),valid,known];
    if(event.kind==='capture')await engine.run('INSERT INTO capture VALUES (?,?,?,?,?,?)',args);
    else {
      assert.equal(event.kind,'refund');
      await engine.run('INSERT INTO refund VALUES (?,?,?,?,?,?)',args);
    }
  } else if (workload.id==='14') {
    await appendRecallProjection(engine,event);
  } else if (workload.id==='17') {
    await appendFunnelProjection(engine,event);
  } else if(workload.id==='15') {
    await appendDependencyProjection(engine,event);
  } else if (workload.id==='20') {
    await appendSupportProjection(engine,event);
  } else if (workload.id==='19') {
    await appendTrainingProjection(engine,event);
  } else if (workload.id==='18') {
    await appendUptimeProjection(engine,event);
  } else if (workload.id==='13') {
    await appendContainmentProjection(engine,event);
  } else if (workload.id==='16') {
    if(event.kind==='run_completed'){
      await engine.run('INSERT INTO run_version VALUES (?,?,?,?,?,?)',
        [event.id,event.subject,p.output.value,BigInt(p.code_version.value),valid,known]);
      for(const input of [p.input_a.value,p.input_b.value])
        await engine.run('INSERT INTO run_input VALUES (?,?,?,?,?)',[event.id,event.subject,input,valid,known]);
    }else{
      assert.equal(event.kind,'lineage_metadata_added');
      await engine.run('INSERT INTO run_input VALUES (?,?,?,?,?)',[event.id,event.subject,p.input.value,valid,known]);
    }
  } else if (accessWorkloads.includes(workload.id)) {
    await appendAccessProjection(engine,event);
  } else {
    assert.equal(workload.id,'10');
    if(event.kind==='workflow_started')await engine.run('INSERT INTO workflow_start VALUES (?,?,?,?,?,?)',
      [event.id,event.subject,p.source.value,BigInt(p.deadline.value),valid,known]);
    else if(event.kind==='workflow_completed')await engine.run('INSERT INTO terminal_completion VALUES (?,?,?,?,?,?)',
      [event.id,event.subject,p.source.value,BigInt(p.completed_at.value),valid,known]);
    else {
      assert.equal(event.kind,'watermark');
      await engine.run('INSERT INTO terminal_watermark VALUES (?,?,?,?,?)',[event.id,event.subject,BigInt(p.through.value),valid,known]);
    }
  }
}

async function ingest(engine,profile,workload,progress) {
  if(workload.id==='05')return ingestWebhookDeliveries(engine,profile,workload,progress,schemaFor(workload).name);
  const {groups,commands}=progress;
  let nativePosition=0n;
  for (const [logicalPosition,events] of eventGroups(workload)) {
    const groupStarted=performance.now();
    if (profile!=='temporal_store') await engine.run('BEGIN');
    try {
      for (const [index,event] of events.entries()) {
        const start=performance.now();
        if (profile==='temporal_store') {
          const command=nativeWrite(workload,event,featureCut=>{
            assert.ok(featureCut<=logicalPosition,'Prediction cannot capture future knowledge');
            if(featureCut<logicalPosition)return positionAt(groups,featureCut);
            assert.equal(index,events.length-1,'Prediction capture requires a completed logical group');
            return nativePosition+1n;
          });
          const receipt=await engine[command.method](command.request);
          assert.equal(receipt.position,++nativePosition);
          assert.equal(receipt.commandId,command.request.commandId);
          const members=command.method==='batch'?receipt.members:[receipt];
          const requested=command.method==='batch'?command.request.members:[command.request];
          assert.deepEqual(members.map(member=>member.entityId).sort(),requested.map(member=>member.entityId).sort());
          commands.push({eventId:event.id,logicalPosition,nativePosition,method:command.method,
            elapsedMs:performance.now()-start,asserted:members.reduce((sum,member)=>sum+member.asserted.length,0),
            retracted:members.reduce((sum,member)=>sum+member.retracted.length,0),requestHash:receipt.requestHash});
        } else {
          await appendSQL(engine,profile,workload,event);
          commands.push({eventId:event.id,logicalPosition,elapsedMs:performance.now()-start});
        }
      }
      if (profile!=='temporal_store') await engine.run('COMMIT');
    } catch (error) {
      if (profile!=='temporal_store') await engine.run('ROLLBACK');
      throw error;
    }
    groups.push({logicalPosition,nativePosition:profile==='temporal_store'?nativePosition:null,events:events.length,
      elapsedMs:performance.now()-groupStarted});
  }
  return {groups,commands};
}

const typedNativeRows=rows=>rows.map(row=>row.map(cell=>({tag:cell.tag,value:cell.tag==='i64'?String(cell.value):cell.value})));

async function query(engine,profile,workload,entry,groups) {
  const known=profile==='temporal_store'?positionAt(groups,BigInt(entry.cut.known_at)):undefined;
  const plan=casePlan(workload,entry,known);
  const started=performance.now();
  let rows,route,reason,position;
  if (profile==='temporal_store') {
    if(plan.interval){
      const {machine,validFrom,validTo}=plan.interval;
      const result=await engine.queryIntervals(plan.program,{knownAt:known,validFrom,validTo,timeoutMs:60000});
      position=result.position;
      rows=uptimeDuration(result.intervals,machine);
      route='native';reason='bounded_native_intervals';
    }else if(plan.lookup){
      const result=await engine.queryLookupAt(plan.program,{attribute:plan.lookup.attribute,
        validAt:BigInt(entry.cut.valid_at),knownAt:known,timeoutMs:60000});
      assert.equal(result.reason,'owned_temporal_lookup');
      position=result.position;
      if(plan.lookup.exists){
        // The native lookup matches the customer/policy edge and returns a
        // typed true marker or an empty set. Complete the boolean wire shape.
        assert.ok(result.rows.length<=1);
        if(result.rows.length)assert.deepEqual(result.rows,[[{tag:'bool',value:true}]]);
        rows=[[{tag:'bool',value:result.rows.length===1}]];
      }else{
        const {columnOrder}=plan.lookup;
        rows=typedNativeRows(columnOrder?result.rows.map(row=>columnOrder.map(index=>row[index])):result.rows);
      }
      route=result.route;reason=result.reason;
    }else{
      const result=await engine.query(plan.program,{validAt:BigInt(entry.cut.valid_at),knownAt:known,forceNative:false,
        maxFacts:100000,maxRounds:2000,maxWork:50000000,timeoutMs:60000});
      position=result.position;
      rows=typedNativeRows(result.rows);
      route=result.route;reason=result.reason;
    }
    assert.equal(position,known);
  } else {
    const spec=profile==='naive_sql'?plan.naive:plan.direct;
    rows=wireRows(await engine.run(spec.sql,spec.params),plan.rowTags);route='sql';reason=profile;
  }
  rows=completeRows(rows,plan);
  const elapsedMs=performance.now()-started;
  assertAnswer(rows,entry.expected_rows);
  return {elapsedMs,rows,route,reason,position};
}

async function sampleResources(engine,profile) {
  if (profile==='temporal_store') return {rssBytes:process.memoryUsage.rss(),duckdb:await engine.resourceStats()};
  const rows=await engine.run('SELECT coalesce(sum(memory_usage_bytes),0)::BIGINT,coalesce(sum(temporary_storage_bytes),0)::BIGINT FROM duckdb_memory()');
  return {rssBytes:process.memoryUsage.rss(),duckdb:{memoryBytes:rows[0][0],temporaryStorageBytes:rows[0][1]}};
}

async function main() {
  const options=parseOptions(process.argv.slice(2)),runtime=resolve(options.runtime),output=resolve(options.output);
  reportRoots.push(runtime);
  const packetBytes=await readFile(resolve(ownRoot,'workloads/temporal-workloads.json'));
  const packet=JSON.parse(packetBytes);
  // Validate the immutable contract separately. Its event oracle is never an
  // input to engine projections or SQL query construction.
  const checked=spawnSync(options.python,[resolve(ownRoot,'workloads/validate_workloads.py')],{encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  const oracleValidation=JSON.parse(checked.stdout);
  const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8);
  const runDirectory=resolve(ownRoot,'build/workload-runs',runId);
  await mkdir(resolve(ownRoot,'build/workload-runs'),{recursive:true});
  await mkdir(runDirectory);await mkdir(dirname(output),{recursive:true});
  const report={schema:'three-engine-workload-screen/1',status:'running',timestampUtc:new Date().toISOString(),
    runDirectory:basename(runDirectory),
    configuration:{...options,runtime:undefined,output:undefined,python:basename(options.python)},packetSha256:hash(packetBytes),oracleValidation,
    scope:'Selected synthetic workloads through three complete read paths.',
    timingScope:'Query through complete typed decoding, lookup output normalization, uptime duration and inventory projection where applicable. Exact answer comparison and warmup excluded.',
    inputScope:'One accepted immutable event per source ID. Workload 05 submits every declared delivery and verifies exact replay; transport delivery cost is outside this synthetic fixture.',
    limitations:['Small functional timing screen limited to the selected workload cases.',
      'The two direct DuckDB baselines cache SQL preparation per connection. Native lookup regenerates its controlled statement on every invocation, and that time is included.',
      'The temporal store uses mandatory audited native ownership. Its startup audit is included in openMs and each query validates the audited generation. Direct SQL baselines use their own query contracts.',
      'Memory/spill samples occur before and after cells, not at the physical allocation peak.'],
    setupScope:'Schema initialization, per-event ingestion and knowledge-group commit cost reported separately; projections receive no uncharged refresh.',
    cutScope:'Native cut maps each logical event knowledge group to its last acknowledged native command. No reads occur inside groups.',
    webhookScope:options.workloads.includes('05')?
      'Every synthetic delivery is submitted in receive order. Native command receipts durably identify accepted source events; its delivery trace is report-only. Query-time max revision chooses state after K/V filtering.':undefined,
    dependencyScope:options.workloads.includes('15')?
      'Synthetic immutable edge snapshot with diamond and cycle, deployment and bounded vulnerability interval. All three read paths recompute set reachability at the requested cut.':undefined,
    intervalJoinScope:options.workloads.some(id=>id==='03'||id==='04')?
      'Price and coverage lookups use record timestamps at the outer mapped knowledge cut. The price packet selects every purchase for its product. The coverage packet has one policy/customer edge and an exact replacement correction.':undefined,
    workload20Scope:options.workloads.includes('20')?
      'Canonical path recomputation at each cut for one four-node DAG. Direct SQL retains physical edge intervals. Each query recomputes path counts or closure. Incremental maintenance has its own qualification.':undefined,
    unimplementedWorkloads:packet.workloads.filter(w=>!supportedWorkloads.includes(w.id)).map(w=>w.id),runs:[]};
  const save=()=>writeFile(output,serialize(report));
  await writeFile(output,serialize(report),{flag:'wx'});
  try {
    report.sourceSha256={};
    for (const path of ['workloads/run_three_engines.mjs','workloads/engine_cases.mjs','workloads/access_cases.mjs','workloads/containment_cases.mjs','workloads/uptime_cases.mjs','workloads/training_cases.mjs','workloads/support_cases.mjs','workloads/interval_join_cases.mjs','workloads/webhook_cases.mjs','workloads/dependency_cases.mjs','workloads/recall_cases.mjs','workloads/funnel_cases.mjs','workloads/event_oracles.py','workloads/validate_workloads.py','adapter/scale-fixture.mjs'])
      report.sourceSha256[path]=hash(await readFile(resolve(ownRoot,path)));
    report.runtimeArtifactSha256={};
    for (const path of ['build/artifact.json','build/temporal_datalog.duckdb_extension','build/temporal_control.node',
      'build/adapter/native-entity.js','build/adapter/native-schema.js','build/adapter/native-duckdb-port.mjs'])
      report.runtimeArtifactSha256[path]=hash(await readFile(resolve(runtime,path)));
    report.nativeBuild=JSON.parse(await readFile(resolve(runtime,'build/artifact.json'),'utf8'));
    for (const path of ['build/owner_probe/artifact.json','build/owner_probe/temporal_owner_probe.duckdb_extension'])
      report.runtimeArtifactSha256[path]=hash(await readFile(resolve(runtime,path)));
    const require=createRequire(resolve(runtime,'package.json'));
    const apiPath=require.resolve('@duckdb/node-api');
    report.duckdbApiSha256=hash(await readFile(apiPath));
    const apiRequire=createRequire(apiPath);
    const bindingsRequire=createRequire(apiRequire.resolve('@duckdb/node-bindings'));
    const binding=bindingsRequire.resolve(`@duckdb/node-bindings-${process.platform}-${process.arch}/duckdb.node`);
    report.duckdbBindingSha256=hash(await readFile(binding));
    const library=process.platform==='darwin'?'libduckdb.dylib':process.platform==='win32'?'duckdb.dll':'libduckdb.so';
    report.duckdbLibrarySha256=hash(await readFile(resolve(dirname(binding),library)));
    const {DuckDBInstance,version}=await import(pathToFileURL(apiPath));
    assert.equal(version(),'v2.0.0');report.duckdbVersion=version();
    const {NativeEntityStore}=await import(pathToFileURL(resolve(runtime,'build/adapter/native-entity.js')));
    const profiles=['naive_sql','direct_duckdb','temporal_store'];
    for (const [index,id] of options.workloads.entries()) {
      const workload=packet.workloads.find(item=>item.id===id);
      const order=[...profiles.slice(index%3),...profiles.slice(0,index%3)];
      for (const profile of order) {
        const database=resolve(runDirectory,id+'-'+profile+'.duckdb');
        const record={workload:id,profile,database:basename(database),status:'opening',cases:[]};
        report.runs.push(record);await save();
        let engine;
        const openEngine=()=>profile==='temporal_store'?NativeEntityStore.open({database,threads:options.threads,
          memoryLimit:options.memoryLimit,maxTempDirectorySize:options.maxTempDirectorySize}):
          sqlEngine(DuckDBInstance,database,options);
        try {
          let start=performance.now();
          engine=await openEngine();
          record.openMs=performance.now()-start;start=performance.now();
          if (profile==='temporal_store') record.schemaReceipt=await engine.defineSchema(schemaFor(workload).dsl);
          else await initializeSQL(engine,profile,workload);
          record.schemaMs=performance.now()-start;start=performance.now();
          record.ingestion={groups:[],commands:[]};
          await ingest(engine,profile,workload,record.ingestion);record.ingestionMs=performance.now()-start;
          record.resourcesBefore=await sampleResources(engine,profile);
          for (const entry of workload.cases) {
            const cell={id:entry.id,operation:entry.operation,cut:entry.cut,status:'running',samples:[]};
            record.cases.push(cell);
            try {
              cell.firstRead=await query(engine,profile,workload,entry,record.ingestion.groups);
              for (let round=0;round<options.warmup;round++) await query(engine,profile,workload,entry,record.ingestion.groups);
              const measured=performance.now();
              for (let round=0;round<options.samples;round++) cell.samples.push(await query(engine,profile,workload,entry,record.ingestion.groups));
              cell.wallMs=performance.now()-measured;cell.latencyMs=quantiles(cell.samples.map(sample=>sample.elapsedMs));
              cell.status='passed';
            } catch (error) {cell.status='failed';cell.error=errorRecord(error);}
            await save();
          }
          record.resourcesAfter=await sampleResources(engine,profile);
          record.status=record.cases.every(cell=>cell.status==='passed')?'passed':'failed';
          await engine.close();engine=null;
          start=performance.now();engine=await openEngine();record.reopenMs=performance.now()-start;
          if(workload.id==='05')await verifyWebhookReopen(engine,profile,workload,record.ingestion,schemaFor(workload).name);
          for (const entry of workload.cases) await query(engine,profile,workload,entry,record.ingestion.groups);
          record.reopenChecksPassed=true;
        } catch (error) {record.status='failed';record.error=errorRecord(error);}
        finally {
          if (engine) try {await engine.close();} catch (error) {record.status='failed';record.closeError=errorRecord(error);}
          try {record.databaseBytes=(await stat(database)).size;} catch (error) {if(error.code!=='ENOENT')throw error;}
        }
        await save();
        console.log(serialize({workload:id,profile,status:record.status,cases:record.cases.length}).trim());
      }
    }
    report.selectedCaseCount=packet.workloads.filter(workload=>options.workloads.includes(workload.id)).reduce((count,workload)=>count+workload.cases.length,0);
    report.executedEngineCaseCount=report.runs.reduce((count,run)=>count+run.cases.length,0);
    report.passedEngineCaseCount=report.runs.reduce((count,run)=>count+run.cases.filter(cell=>cell.status==='passed').length,0);
    report.status=report.runs.every(run=>run.status==='passed')?'passed':'failed';
  } catch (error) {report.status='failed';report.error=errorRecord(error);}
  await save();
  if (report.status!=='passed') process.exitCode=1;
}

if (process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
