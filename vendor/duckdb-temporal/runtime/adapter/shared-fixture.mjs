// Cross-language fixture: arguments are a test-owned database and operation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';

const port=await NativeDuckDBPort.open({database:process.argv[2]});
const backend=new PublicDuckDBBackend(port,'cross-language-fixture');
try{
  await backend.initialize(await readFile(new URL('./public-schema.sql',import.meta.url),'utf8'));
  if(process.argv[3]==='cycle'){
    await backend.withTransaction(async session=>{
      assert.equal(await session.currentCommitPosition(),1);
      assert.equal((await session.getById('python-age')).value_number,7);
      assert.equal(await session.claimCommand('node-command','node-tx',10),null);
      const pos=await session.nextCommitPosition();
      await session.insert({entityId:'u',attribute:'age',value:{type:'number',value:9.5},validFrom:1.25,validTo:4.5},'node-tx',10,'node-age',pos);
      await session.insert({entityId:'u',attribute:'manager',value:{type:'ref',value:'boss'}},'node-tx',10,'node-ref',pos);
    });
  }else if(process.argv[3]==='inspect'){
    await backend.read(async session=>{
      assert.equal(await session.currentCommitPosition(),3);
      assert.equal(await session.getById('node-age'),null);
      assert.equal((await session.history('u')).find(row=>row.id==='node-age').retracted_position,3);
      assert.equal((await session.getById('replacement')).value_number,11);
      assert.equal(await session.claimCommand('node-command','ignored',11),'node-tx');
    });
  }else throw new Error('unknown fixture operation');
  console.log('PASS');
}finally{await backend.close();}
