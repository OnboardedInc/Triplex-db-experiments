import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {EntityId} from '@triplex-build/triplex';
import {DatabaseScope} from '@triplex-build/triplex/runtime';
import {PublicDuckDBBackend} from './public-backend.mjs';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

const schema=await readFile(new URL('./public-schema.sql',import.meta.url),'utf8');
const scope=DatabaseScope.test('native-retained-reservation');
const input={
  entityId:EntityId.make('archive-🙂'),attribute:'résumé',
  value:{type:'blob' as const,value:'sha256:example',mimeType:'text/plain',size:5,filename:'é.txt'},
};
const bytes=BigInt(Buffer.byteLength(input.entityId)+Buffer.byteLength(input.attribute)+
  Buffer.byteLength(JSON.stringify(input.value.value))+
  Buffer.byteLength(JSON.stringify({mimeType:'text/plain',size:5,filename:'é.txt'})));
const maxFacts=1000000n,maxBytes=268435456n,maxInt64=9223372036854775807n;
const usageSql='SELECT retained_count,retained_bytes FROM main.storage_usage WHERE singleton';

function rolledBack(pattern:RegExp){
  return (error:unknown)=>{
    assert.ok(error instanceof Error&&'code' in error&&'outcome' in error);
    assert.equal(error.code,'ROLLED_BACK');
    assert.equal(error.outcome,'rollback_ack');
    assert.ok(error.cause instanceof Error);
    assert.match(error.cause.message,pattern);
    return true;
  };
}

test('native retained reservation admits both exact caps and rejects overflow before append',async()=>{
  const port=await NativeDuckDBPort.open();
  const backend=new PublicDuckDBBackend(port,scope);
  const run=(sql:string,params:readonly unknown[]=[])=>port.run({name:'reservation_fixture',sql,params});
  const seedUsage=(facts:bigint,payload:bigint)=>run(
    'UPDATE main.storage_usage SET retained_count=$1::BIGINT,retained_bytes=$2::BIGINT WHERE singleton',[facts,payload]);
  try{
    await backend.initialize(schema);
    // Seed synthetic accounting near the boundaries without allocating a million facts or 256 MiB.
    await seedUsage(maxFacts-1n,maxBytes-bytes);
    await backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),1);
      assert.equal(await session.claimCommand('exact','tx-exact',10),null);
      await session.insert(input,'tx-exact',10,'exact',1);
      assert.equal((await session.getById('exact'))?.value_json,
        JSON.stringify({mimeType:'text/plain',size:5,filename:'é.txt'}));
    });
    assert.deepEqual(await run(usageSql),[[maxFacts,maxBytes]]);
    assert.deepEqual(await run(
      'SELECT (octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+'+
      'octet_length(encode(extra_json)))::BIGINT FROM main.assertions'),[[bytes]]);

    for(const [facts,payload,message] of [
      [maxFacts,maxBytes-bytes,/TD_E_COMPAT_LIMIT: Shared retained storage admission exceeded/],
      [maxFacts-1n,maxBytes-bytes+1n,/TD_E_COMPAT_LIMIT: Shared retained storage admission exceeded/],
      [maxInt64,0n,/TD_E_COMPAT_INPUT: Integer cannot be safely exposed to public Number/],
      [0n,maxInt64,/TD_E_COMPAT_INPUT: Integer cannot be safely exposed to public Number/],
    ] as const){
      await seedUsage(facts,payload);
      const before=port.trace().at(-1)?.id??0;
      await assert.rejects(backend.withTransaction(async session=>{
        assert.equal(await session.nextCommitPosition(),2);
        assert.equal(await session.claimCommand('refused','tx-refused',11),null);
        await session.insert(input,'tx-refused',11,'refused',2);
      }),rolledBack(message));
      assert.deepEqual(port.trace().filter(event=>event.id>before&&event.name==='public_reserve_retained_usage')
        .map(event=>event.ok),[false]);
      assert.ok(!port.trace().some(event=>event.id>before&&event.name==='public_insert_chunk'));
      assert.deepEqual(await run(usageSql),[[facts,payload]]);
      assert.deepEqual(await run('SELECT position FROM main.clock'),[[1n]]);
      assert.deepEqual(await run('SELECT command_id FROM main.commands'),[['exact']]);
      assert.deepEqual(await run('SELECT assertion_id FROM main.assertions'),[['exact']]);
    }

    await run('DELETE FROM main.storage_usage WHERE singleton');
    const beforeMissing=port.trace().at(-1)?.id??0;
    await assert.rejects(backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),2);
      await session.insert(input,'tx-missing',11,'missing',2);
    }),rolledBack(/Shared retained storage admission exceeded/));
    assert.ok(!port.trace().some(event=>event.id>beforeMissing&&event.name==='public_insert_chunk'));
    assert.deepEqual(await run(usageSql),[]);
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[1n]]);
    assert.deepEqual(await run('SELECT assertion_id FROM main.assertions'),[['exact']]);

    const reserve='SELECT system.main.td_triplex_reserve_usage_v1($1::BIGINT,$2::BIGINT,$3::BIGINT,$4::BIGINT)';
    await assert.rejects(run(reserve,[0n,0n,maxInt64,0n]),/TD_E_COMPAT_LIMIT/);
    await assert.rejects(run(reserve,[0n,0n,1n,maxInt64]),/TD_E_COMPAT_LIMIT/);
    await assert.rejects(run(reserve,[0n,0n,1n,-1n]),/TD_E_COMPAT_INPUT/);
    await assert.rejects(run(reserve,[null,0n,1n,0n]),/TD_E_COMPAT_INPUT/);
    assert.deepEqual(await run(reserve,[0n,0n,1n,0n]),[[true]]);
  }finally{await backend.close();}
});

test('late appender failure rolls back both reservations, claims and facts on the caller transaction',async()=>{
  const port=await NativeDuckDBPort.open();
  const backend=new PublicDuckDBBackend(port,scope);
  const run=(sql:string)=>port.run({name:'reservation_fixture',sql,params:[]});
  const attempts=(after:number)=>port.trace().filter(event=>event.id>after&&
    ['public_reserve_retained_usage','public_insert_chunk'].includes(event.name));
  try{
    await backend.initialize(schema);
    await backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),1);
      assert.equal(await session.claimCommand('seed','tx-seed',10),null);
      await session.insert(input,'tx-seed',10,'seed',1);
    });
    const batch=Array.from({length:2050},()=>input);
    const ids=batch.map((_,index)=>index===2049?'seed':'new-'+index);
    const before=port.trace().at(-1)?.id??0;
    await assert.rejects(backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),2);
      assert.equal(await session.claimCommand('retry','tx-failed',11),null);
      try{
        await session.batchInsert(batch,'tx-failed',11,ids,2);
      }catch(error){
        assert.ok(error instanceof Error);
        assert.match(error.message,/duplicate|primary key|constraint/i);
        // A caught failure must still poison the caller's transaction.
      }
    }),rolledBack(/duplicate|primary key|constraint/i));
    assert.deepEqual(attempts(before).map(event=>[event.name,event.op,event.ok]),[
      ['public_reserve_retained_usage','run',true],['public_insert_chunk','append',true],
      ['public_reserve_retained_usage','run',true],['public_insert_chunk','append',false],
    ]);
    assert.deepEqual(await run(usageSql),[[1n,bytes]]);
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[1n]]);
    assert.deepEqual(await run('SELECT command_id FROM main.commands'),[['seed']]);
    assert.deepEqual(await run('SELECT assertion_id FROM main.assertions'),[['seed']]);

    await backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),2);
      assert.equal(await session.claimCommand('retry','tx-good',12),null);
      await session.batchInsert(batch.slice(0,2),'tx-good',12,ids.slice(0,2),2);
      assert.equal((await session.getById('new-0'))?.tx_id,'tx-good');
      assert.deepEqual(await session.runRecords(usageSql),[{retained_count:3,retained_bytes:Number(bytes*3n)}]);
    });
    const beforeReplay=port.trace().at(-1)?.id??0;
    await backend.withTransaction(async session=>{
      assert.equal(await session.claimCommand('retry','unused',13),'tx-good');
      assert.equal(await session.currentCommitPosition(),2);
    });
    assert.deepEqual(attempts(beforeReplay),[]);
    assert.deepEqual(await run(usageSql),[[3n,bytes*3n]]);
    assert.deepEqual(await run('SELECT assertion_id FROM main.assertions ORDER BY assertion_id'),
      [['new-0'],['new-1'],['seed']]);
  }finally{await backend.close();}
});
