// [CX-VP2B-R2] Why: distinguish a JS pause after get() from OS descheduling while a native statement owns a real SQLite snapshot. Rejected: inferring WAL safety from db.inTransaction alone for implicit reads.
const {parentPort,workerData}=require('node:worker_threads');
require(workerData.tsx);
const {BrokerReadService}=require(workerData.source);
const service=new BrokerReadService(workerData.file,workerData.watermark), db=service.db;
const gate=new Int32Array(workerData.gate);
let mode;
const hold=()=>{Atomics.store(gate,0,1);Atomics.notify(gate,0);if(Atomics.wait(gate,1,0,25000)==='timed-out')throw Error('Reviewer control timed out');};
db.function('__review_pause',()=>{if(mode==='native'){mode=undefined;hold();}return 1;});
const prepare=db.prepare.bind(db);
db.prepare=sql=>{
 if(sql.startsWith("SELECT 'marker' kind"))sql=sql.replace('FROM marker WHERE id=1','FROM marker WHERE id=1 AND __review_pause()');
 const statement=prepare(sql);
 if(sql.startsWith('SELECT lsn,epoch')){const get=statement.get.bind(statement);statement.get=(...args)=>{const result=get(...args);if(mode==='probe'){mode=undefined;hold();}return result;};}
 return statement;
};
parentPort.on('message',async({id,op,basis,selection,pause})=>{try{
 if(op==='close'){service.close();parentPort.postMessage({id,result:true});return;}
 if(op==='state'){parentPort.postMessage({id,result:{inTransaction:db.inTransaction,head:service.head()}});return;}
 mode=pause;
 const result=op==='source'?await service.fromLogAsync(0,selection??{},()=>true):await service.pullAt(basis,selection??{});
 parentPort.postMessage({id,result});
}catch(e){parentPort.postMessage({id,error:{message:String(e),reason:e.reason,tag:e._tag}});}});
parentPort.postMessage({ready:true});
