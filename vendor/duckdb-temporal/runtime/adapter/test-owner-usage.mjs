import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {PublicDuckDBBackend} from './public-backend.mjs';

const {NativeDuckDBPort}=await import(new URL('../build/adapter/native-duckdb-port.mjs',import.meta.url));
const build=fileURLToPath(new URL('../build/',import.meta.url));
const publicSchema=await readFile(new URL('./public-schema.sql',import.meta.url),'utf8');
const usage='SELECT retained_count,retained_bytes FROM main.storage_usage WHERE singleton';
const scan=(knownAt=-1)=>`PRAGMA td_query_store_scalable(
  'answer(?v) :- triple(?e,"résumé",?v).',0,${knownAt},1000,1000,1048576,1000,1048576,0)`;
const run=(port,sql)=>port.runNative({name:'usage_assertion',sql,params:[]});
const mutate=(port,sql)=>port.run({name:'usage_fault',sql,params:[]});
const bytes=(...parts)=>parts.reduce((total,part)=>total+BigInt(Buffer.byteLength(part,'utf8')),0n);

test('a fresh owned catalog audits the empty retained ledger',async()=>{
  const port=await NativeDuckDBPort.openWithOwner();
  try{
    await port.activateOwnership();
    assert.deepEqual(await run(port,usage),[[0n,0n]]);
    assert.equal((await run(port,scan()))[0]?.[6],null);
  }finally{await port.close();}
});

test('owner audit counts inactive legacy carriers and exact UTF-8 blob metadata bytes',async()=>{
  const directory=await mkdtemp(join(build,'owner-usage-'));
  const database=join(directory,'legacy.duckdb');
  const raw=await NativeDuckDBPort.open({database});
  const backend=new PublicDuckDBBackend(raw,'owner-usage-legacy');
  try{
    await backend.initialize(publicSchema);
    await backend.withTransaction(async session=>{
      const position=await session.nextCommitPosition();
      assert.equal(position,1);
      await session.claimCommand('legacy-write','legacy-write',1);
      await session.batchInsert([
        {entityId:'été🙂',attribute:'résumé',validFrom:0,value:{type:'string',value:'élan🙂'}},
        {entityId:'doc🙂',attribute:'attachment',validFrom:0,value:{type:'blob',value:'sha256:opaque',
          mimeType:'text/plain',size:3,filename:'ré🙂.txt'}},
      ],'legacy-write',1,['text','blob'],position);
    });
    await backend.withTransaction(async session=>{
      const position=await session.nextCommitPosition();
      assert.equal(position,2);
      await session.claimCommand('legacy-retract','legacy-retract',2);
      assert.equal(await session.retract('text',2,'legacy-retract',position),true);
    });
  }finally{await backend.close();}

  const inactiveCharge=bytes('été🙂','résumé','"élan🙂"');
  const blobMetadata=bytes('{"mimeType":"text/plain","size":3,"filename":"ré🙂.txt"}');
  const exact=inactiveCharge+bytes('doc🙂','attachment','"sha256:opaque"')+blobMetadata;
  const port=await NativeDuckDBPort.openWithOwner({database});
  try{
    await port.activateOwnership();
    assert.deepEqual(await run(port,usage),[[2n,exact]]);
    assert.deepEqual(await run(port,'SELECT assertion_id,tx_to FROM main.assertions ORDER BY assertion_id'),
      [['blob',9223372036854775807n],['text',2n]]);
    assert.deepEqual(JSON.parse((await run(port,scan(1)))[0][6]),[{tag:1,s:'élan🙂',b:null,i:null,f:null}]);
    assert.equal((await run(port,scan()))[0]?.[6],null);
    for(const [count,charge,label] of [
      [1n,exact,'omitted inactive row'],
      [2n,exact-inactiveCharge,'omitted inactive row bytes'],
      [2n,exact-blobMetadata,'omitted blob descriptor bytes'],
    ]){
      await mutate(port,`UPDATE main.storage_usage SET retained_count=${count},retained_bytes=${charge}`);
      await assert.rejects(port.activateOwnership(),/TD_E_OWNER_AUDIT_USAGE/,label);
      assert.deepEqual(await run(port,usage),[[count,charge]],label);
      await assert.rejects(run(port,scan()),/TD_E_OWNER_PROBE_INVALID/,label);
      await mutate(port,`UPDATE main.storage_usage SET retained_count=2,retained_bytes=${exact}`);
      await port.activateOwnership();
      assert.equal((await run(port,scan()))[0]?.[6],null,label);
    }
  }finally{await port.close();}
});
