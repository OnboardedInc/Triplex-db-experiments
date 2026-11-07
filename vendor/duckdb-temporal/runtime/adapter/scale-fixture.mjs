import assert from 'node:assert/strict';

export const SCALE_INFINITY = 9223372036854775807n;
export const SCALE_SCHEMA = 'schema scale version 1 { entity Row { i:int64 many; } }';
export const scaleEntity = index => 'scale-e-' + String(index).padStart(8, '0');
export const scaleCommand = index => 'scale-c-' + String(index).padStart(8, '0');

export function scaleRecord(start, end) {
  return '{' + Array.from({length:end-start}, (_, offset) => 'i=' + (start+offset) + ';').join('') + '}';
}

export function scaleExpected(size, groupSize, kind, added=0, entityIds) {
  const count = BigInt(size + added);
  if (kind === 'count') return [[{tag:'i64', value:count}]];
  if (kind === 'sum') return [[{tag:'i64', value:count*(count-1n)/2n}]];
  if (kind !== 'grouped_sum') throw new Error('Unknown scale query kind');
  const rows = [];
  for (let start=0; start<size; start+=groupSize) {
    const end = Math.min(size, start+groupSize);
    rows.push([{tag:'str', value:scaleEntity(start/groupSize)},
      {tag:'i64', value:BigInt(end-start)*BigInt(start+end-1)/2n}]);
  }
  // Each ongoing native command owns one new entity and one new fact.
  for (let index=0; index<added; index++) {
    rows.push([{tag:'str', value:entityIds?.[index]??'write-e-' + String(index).padStart(8, '0')},
      {tag:'i64', value:BigInt(size+index)}]);
  }
  return rows.sort((left,right)=>Buffer.compare(Buffer.from(left[0].value),Buffer.from(right[0].value)));
}

export function fixtureExpected(fixture,kind,added=0) {
  const initialAdded=fixture.initialAdded??0;
  const initialIds=fixture.initialEntityIds??Array.from({length:initialAdded},(_,index)=>'write-e-'+String(index).padStart(8,'0'));
  const newIds=Array.from({length:added},(_,index)=>(fixture.writePrefix??'write-e-')+String(index).padStart(8,'0'));
  return scaleExpected(fixture.size,fixture.groupSize,kind,initialAdded+added,[...initialIds,...newIds]);
}

export function baselineFromEvidence(source) {
  assert.equal(source.stages.length,1,'A single-stage source receipt is required');
  const stage=source.stages[0];
  assert.equal(stage.status,'passed','The source stage must have completed');
  const size=stage.size;
  const groupSize=source.configuration.groupSize;
  const groups=Math.ceil(size/groupSize);
  const priorAdded=stage.fixture?.initialAdded??0;
  const initialEntityIds=[...(stage.fixture?.initialEntityIds??Array.from({length:priorAdded},(_,index)=>'write-e-'+String(index).padStart(8,'0')))];
  const mixed=stage.cells.filter(cell=>cell.mixedIngestion).at(-1);
  if (mixed) {
    assert.equal(mixed.status,'passed');assert.equal(mixed.finalReadVerified,true);
    mixed.writes.forEach((write,index)=>{
      assert.equal(BigInt(write.position),BigInt(groups+priorAdded+index+1));
      initialEntityIds.push(write.entityId??'write-e-'+String(index).padStart(8,'0'));
    });
  }
  const initialAdded=initialEntityIds.length;
  const position=BigInt(groups+initialAdded);
  if (stage.probe) assert.equal(BigInt(stage.probe.result.position),position);
  return {size,groupSize,groups,initialAdded,initialEntityIds,position,latestCut:true};
}

export function scaleQueries() {
  const source = "source(?e,?v) :- triple(?e,'i',?v). ";
  return [
    {kind:'count', program:source+'answer(count()) :- source(?e,?v).'},
    {kind:'sum', program:source+'answer(sum_i64(?v)) :- source(?e,?v).'},
    {kind:'grouped_sum', program:source+'answer(?e,sum_i64(?v)) :- source(?e,?v).'},
  ];
}

async function auditFixture(run,{size,groups,groupSize,retainedValidity,onCheck,onReceiptBatch}) {
  const count = BigInt(size);
  const usage = await run(`SELECT count(*),
    sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload)))::BIGINT FROM main.assertions`);
  assert.equal(usage[0][0],count);
  const checks = [
    ['history',`SELECT count(*) FROM td_catalog_v1.entity_history`,[[count]]],
    ['carrier',`SELECT count(*) FROM main.assertions WHERE (${retainedValidity}) IS NOT TRUE`,[[0n]]],
    ['usage',`SELECT position,retained_count,retained_bytes FROM main.clock,main.storage_usage
      WHERE main.clock.singleton AND main.storage_usage.singleton`,[[BigInt(groups),count,usage[0][1]]]],
    ['receipt_totals',`SELECT count(*),sum(json_array_length(receipt,'$.asserted'))::BIGINT FROM main.commands`,[[BigInt(groups),count]]],
    ['value_domain',`SELECT count(DISTINCT v_i),min(v_i),max(v_i),sum(v_i)::BIGINT FROM main.assertions`,
      [[count,0n,count-1n,count*(count-1n)/2n]]],
    ['command_identity',`SELECT count(*) FROM main.commands WHERE position NOT BETWEEN 1 AND ${groups}
      OR command_id<>'scale-c-' || lpad((position-1)::VARCHAR,8,'0')`,[[0n]]],
    ['fact_identity',`SELECT count(*) FROM main.assertions WHERE a<>'i' OR valid_from<>0 OR valid_to<>9223372036854775807
      OR tx_to<>9223372036854775807 OR tx_from<>floor(v_i/${groupSize})::BIGINT+1
      OR e<>'scale-e-' || lpad((tx_from-1)::VARCHAR,8,'0')`,[[0n]]],
  ];
  // Separate statements keep independent full-history aggregates from retaining concurrent state.
  for (const [name,sql,expected] of checks) {
    await onCheck?.(name);
    try {assert.deepEqual(await run(sql),expected);}
    catch (error) {error.fixturePhase='fixture_audit_'+name;throw error;}
  }
  // Keep large receipt strings and ID lists bounded independently of fixture size.
  for (let first=1; first<=groups; first+=64) {
    const end = Math.min(groups+1,first+64);
    const membership = await run(`SELECT count(*) FROM main.commands c LEFT JOIN (
      SELECT command_id,list(assertion_id ORDER BY assertion_id) ids FROM main.assertions
      WHERE tx_from>=${first} AND tx_from<${end} GROUP BY command_id
    ) a USING(command_id) WHERE c.position>=${first} AND c.position<${end}
      AND list_sort(CAST(json_extract(c.receipt,'$.asserted') AS VARCHAR[])) IS DISTINCT FROM a.ids`);
    assert.deepEqual(membership,[[0n]]);
    await onReceiptBatch?.(first,end-1);
  }
}

/** Native fixture writes, with an explicitly selected setup-only expansion alternative. */
export async function createScaleFixture({NativeEntityStore, NativeDuckDBPort, database, size,
  groupSize=4096, mode='native', openOptions={}, retainedValidity,onProgress,resumeCommands=0}) {
  assert.ok(Number.isSafeInteger(size) && size>0);
  assert.ok(Number.isSafeInteger(groupSize) && groupSize>0 && groupSize<=4096);
  assert.ok(mode==='expanded' || mode==='native');
  const groups = Math.ceil(size/groupSize);
  assert.ok(Number.isSafeInteger(resumeCommands) && resumeCommands>=0 && resumeCommands<=groups);
  assert.ok(!resumeCommands || mode==='native','Only native fixtures support resume');
  const started = performance.now();
  let lastProgress = started;
  let completedCommands = resumeCommands;
  async function progress(phase,force=false,details={}) {
    const now = performance.now();
    if (onProgress && (force || completedCommands%128===0 || now-lastProgress>=5000)) {
      await onProgress({phase,elapsedMs:now-started,completedCommands,
        acknowledgedFixtureFacts:Math.min(size,completedCommands*groupSize),requestedFacts:size,
        setupRoute:mode==='native'?'native_put_record':'native_seed_and_native_validated_sql_expansion',...details});
      lastProgress=now;
    }
  }
  if (resumeCommands) {
    const resumed = await NativeDuckDBPort.open({...openOptions,database});
    const run = sql=>resumed.run({name:'scale_fixture_resume_audit',sql,params:[]});
    try {
      await progress('resume_prefix_audit',true);
      assert.deepEqual(await run("SELECT dsl FROM td_catalog_v1.schemas WHERE name='scale' AND version=1"),[[SCALE_SCHEMA]]);
      const prefixFacts = BigInt(Math.min(size,resumeCommands*groupSize));
      assert.deepEqual(await run(`SELECT (SELECT count(*) FROM main.assertions),
        (SELECT position FROM main.clock WHERE singleton),
        (SELECT retained_count FROM main.storage_usage WHERE singleton),
        (SELECT count(*) FROM main.commands),(SELECT max(position) FROM main.commands),
        (SELECT count(*) FROM td_catalog_v1.entity_commands)`),
      [[prefixFacts,BigInt(resumeCommands),prefixFacts,BigInt(resumeCommands),BigInt(resumeCommands),BigInt(resumeCommands)]]);
      await progress('resume_prefix_verified',true);
    } catch (error) {error.fixturePhase='resume_prefix_audit';throw error;}
    finally {await resumed.close();}
  }
  let store = await NativeEntityStore.open({...openOptions, database});
  let schema;
  let phase = 'native_schema';
  try {
    schema = await store.defineSchema(SCALE_SCHEMA);
    if (resumeCommands) {
      for (const index of new Set([0,resumeCommands-1])) {
        const receipt = await store.receipt(scaleCommand(index));
        assert.equal(receipt?.position,BigInt(index+1));
        assert.equal(receipt?.entityId,scaleEntity(index));
        assert.equal(receipt?.schemaHash,schema.hash);
        assert.equal(receipt?.asserted.length,Math.min(groupSize,size-index*groupSize));
      }
    }
    await progress('native_schema_ready',true);
    const nativeGroups = mode==='native' ? groups : 1;
    for (let index=resumeCommands; index<nativeGroups; index++) {
      phase = 'native_command_'+index;
      await store.putRecord({schema:'scale', version:1, type:'Row',
        entityId:scaleEntity(index), commandId:scaleCommand(index),
        record:scaleRecord(index*groupSize, Math.min(size, (index+1)*groupSize)),
        validFrom:0n, validTo:SCALE_INFINITY});
      completedCommands=index+1;
      await progress('native_ingestion');
    }
  } catch (error) {error.fixturePhase??=phase;throw error;}
  finally { await store.close(); }

  const port = await NativeDuckDBPort.open({...openOptions, database});
  const run = sql => port.run({name:'scale_fixture_setup', sql, params:[]});
  try {
    if (mode==='expanded') {
      // Bound setup intermediates independently of the requested fixture size.
      for (let first=1; first<groups; first++) {
        const end = first+1;
        await port.begin();
        try {
          phase = 'expanded_command_'+first;
          await run(`CREATE TEMP TABLE __td_scale_commands AS
            WITH records AS (
              SELECT g.idx, 'scale-e-' || lpad(g.idx::VARCHAR,8,'0') entity_id,
                'scale-c-' || lpad(g.idx::VARCHAR,8,'0') command_id,
                '{' || string_agg('i=' || r.value::VARCHAR || ';','' ORDER BY r.value) || '}' record_text
              FROM range(${first},${end}) g(idx),
                LATERAL range(g.idx*${groupSize},least(${size},(g.idx+1)*${groupSize})) r(value)
              GROUP BY g.idx
            ), prepared AS (
              SELECT r.*,s.content_hash schema_hash,
                td_prepare_entity_v1(s.dsl,s.ir,'Row',r.record_text) values_ir
              FROM records r,td_catalog_v1.schemas s WHERE s.name='scale' AND s.version=1
            ) SELECT *,idx+1 position,sha256(to_json(struct_pack(kind:='td.entity.put/1',
              schema_name:='scale',schema_version:=1::INTEGER,schema_hash:=schema_hash,
              entity_type:='Row',entity_id:=entity_id,valid_from:=0::BIGINT,
              valid_to:=9223372036854775807::BIGINT,values_ir:=values_ir))) request_hash
            FROM prepared`);
          await run(`CREATE TEMP TABLE __td_scale_assertions AS SELECT c.command_id,c.entity_id,c.position,
            j.key::BIGINT ordinal,
            sha256(to_json(struct_pack(command_id:=c.command_id,ordinal:=j.key::BIGINT))) assertion_id,
            json_extract_string(j.value,'$.payload') payload,
            json_extract_string(j.value,'$.i')::BIGINT value
            FROM __td_scale_commands c,json_each(c.values_ir) j`);
          await run(`INSERT INTO td_catalog_v1.entity_owners
            SELECT entity_id,'scale','Row' FROM __td_scale_commands`);
          await run(`INSERT INTO main.commands SELECT c.command_id,c.request_hash,c.position,
            to_json(struct_pack(command_id:=c.command_id,position:=c.position,
              asserted:=a.ids,retracted:=[]::VARCHAR[]))::VARCHAR,
            c.command_id,0::DOUBLE,'triplex'
            FROM __td_scale_commands c JOIN (
              SELECT command_id,list(assertion_id ORDER BY ordinal) ids
              FROM __td_scale_assertions GROUP BY command_id
            ) a USING(command_id)`);
          await run(`INSERT INTO td_catalog_v1.entity_commands
            SELECT command_id,'scale',1,'Row',entity_id,position,schema_hash FROM __td_scale_commands`);
          await run(`INSERT INTO main.assertions
            SELECT assertion_id,entity_id,'i','i64',payload,0,9223372036854775807,position,
              9223372036854775807,command_id,NULL,sha256(payload),3,NULL,NULL,value,NULL,
              0,NULL,0,NULL,NULL,'Row',command_id,NULL,NULL,'triplex',TRUE
            FROM __td_scale_assertions`);
          await run(`UPDATE main.storage_usage SET
            retained_count=retained_count+(SELECT count(*) FROM __td_scale_assertions),
            retained_bytes=retained_bytes+(SELECT sum(octet_length(encode(entity_id))+1+
              octet_length(encode(payload))) FROM __td_scale_assertions) WHERE singleton`);
          await run(`UPDATE main.clock SET position=${end} WHERE singleton`);
          await run('DROP TABLE __td_scale_assertions');
          await run('DROP TABLE __td_scale_commands');
          await port.commit();
          completedCommands=end;
          await progress('expanded_ingestion');
        } catch (error) {
          try { await port.rollback(); } catch (cleanup) { throw new AggregateError([error,cleanup], 'Fixture rollback failed'); }
          throw error;
        }
      }
    }
    phase = 'full_fixture_audit';
    await progress(phase,true);
    await auditFixture(run,{size,groups,groupSize,retainedValidity,
      onCheck:async name=>progress('fixture_audit_'+name,true),
      onReceiptBatch:async(first,last)=>progress('receipt_audit',false,{first,last})});
    phase = 'fixture_checkpoint';
    await progress(phase,true);
    await run('CHECKPOINT');
  } catch (error) {error.fixturePhase??=phase;throw error;}
  finally { await port.close(); }

  // Replay verifies that SQL-created request/receipt identity matches the native API.
  store = await NativeEntityStore.open({...openOptions, database});
  try {
    await progress('native_replay',true);
    for (const index of new Set([0,groups-1])) {
      phase = 'native_replay_'+index;
      const replay = await store.putRecord({schema:'scale',version:1,type:'Row',
        entityId:scaleEntity(index),commandId:scaleCommand(index),
        record:scaleRecord(index*groupSize, Math.min(size,(index+1)*groupSize)),
        validFrom:0n,validTo:SCALE_INFINITY});
      assert.equal(replay.position,BigInt(index+1));
      assert.equal(replay.asserted.length,Math.min(groupSize,size-index*groupSize));
      assert.equal(replay.schemaHash,schema.hash);
    }
  } catch (error) {error.fixturePhase=phase;throw error;}
  finally { await store.close(); }
  await progress('ready',true);
  return {size,groupSize,groups,position:BigInt(groups),schemaHash:schema.hash,
    resumedFromCommands:resumeCommands,
    setupRoute:mode==='native'?'native_put_record':'native_seed_and_native_validated_sql_expansion',
    audit:{retainedCarrier:true,allNativeHistoryBindings:true,usage:true,receipts:true,nativeReplay:true}};
}

export function quantiles(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  const at = fraction => sorted[Math.max(0,Math.ceil(fraction*sorted.length)-1)];
  return {count:sorted.length,min:sorted[0],p50:at(0.5),p95:at(0.95),p99:at(0.99),max:sorted.at(-1)};
}

export function countWriteOverlaps(samples, writes) {
  const starts = writes.map(write=>write.startOffsetMs).sort((a,b)=>a-b);
  const ends = writes.map(write=>write.startOffsetMs+write.elapsedMs).sort((a,b)=>a-b);
  function rank(values,bound,inclusive) {
    let low=0, high=values.length;
    while (low<high) {
      const middle=Math.floor((low+high)/2);
      if (values[middle]<bound || inclusive && values[middle]===bound) low=middle+1;
      else high=middle;
    }
    return low;
  }
  return samples.reduce((count,sample)=>count+
    rank(starts,sample.startOffsetMs+sample.elapsedMs,false)-rank(ends,sample.startOffsetMs,true),0);
}

export function errorRecord(error) {
  return {name:error?.name??'Error',code:error?.code??null,
    ...(error?.fixturePhase?{fixturePhase:error.fixturePhase}:{}),
    message:String(error?.message??error).replaceAll(/\/(?:Users|workspace|tmp|private|var|home)\/[^\s:'"]+/g,'<path>')};
}
