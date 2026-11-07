// Abrupt exits intentionally omit close; only test-owned databases are passed.
import { readFile } from 'node:fs/promises';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';

const [database,phase,scope]=process.argv.slice(2);
const port=await NativeDuckDBPort.open({database});
if(phase==='first_chunk'){
  const run=port.run.bind(port);let count=0;
  Object.defineProperty(port,'run',{value:plan=>{
    if(plan.kind==='append'&&++count===2)process.exit(73);
    return run(plan);
  }});
}
const backend=new PublicDuckDBBackend(port,scope);
await backend.initialize(await readFile(new URL('./public-schema.sql',import.meta.url),'utf8'));
await backend.withTransaction(async session=>{
  await session.claimCommand('crash-command','crash-tx',20);
  const position=await session.nextCommitPosition();
  const rows=Array.from({length:2049},(_,n)=>({entityId:'u-'+n,attribute:'age',value:{type:'number',value:n}}));
  await session.batchInsert(rows,'crash-tx',20,rows.map((_,n)=>'crash-'+n),position);
  if(phase==='before_commit')process.exit(73);
});
if(phase==='after_commit')process.exit(73);
throw new Error('unknown crash-fixture phase');
