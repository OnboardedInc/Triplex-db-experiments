// [DX-B8] Why: exercise receipt publication, offered writer scheduling and cut/ACK checks without spending an engine lease.
// Rejected: using this fake peer as database exactness or performance evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Effect} from 'effect';
import {mixed} from './mixed.mjs';
const out=process.env.B8_DRIVER_OUTPUT;
assert.ok(out && out.startsWith('/tmp/dxb8-'));
fs.mkdirSync(out,{recursive:true});
const newest=new SharedArrayBuffer(8), transactions=[];
let position=0;
const w={client:{create:async()=>({db:'fake'}),rowCache:{bytes:0,size:0,evictions:0,has:()=>true}},adapter:{},runtime:{runPromise:Effect.runPromise},triples:{transact:()=>Effect.sync(()=>{
 const txId=`fake-${++position}`;
 w.client.onCommit({transactionIds:[txId],httpCalls:1,clockReplays:0});
 transactions.push({txId,triples:[{attribute:':_tx/position',value:{value:position}}]});
 return {txId,position,triples:[]};
})}};
const feed={client:{close(){}},runtime:{dispose:async()=>{}},adapter:{getTransactionsAfter:cursor=>Effect.promise(async()=>{
 await new Promise(r=>setTimeout(r,1));return transactions.filter(t=>Number(t.txId.slice(5))>cursor);
})}};
const workers=Array.from({length:4},()=>({postMessage(message){
 assert.equal(message.movingBasis,true);
 const cut=Number(Atomics.load(new BigInt64Array(newest),0));
 setTimeout(()=>this.deliver({times:[1],basisCounts:{[cut]:1},workerUtilisation:0}),message.durationMs);
}}));
await mixed({w,feed,scope:'fake-driver-only',states:new Map(Array.from({length:400},(_,i)=>[i,{}])),workers,once:worker=>new Promise(resolve=>worker.deliver=resolve),initialPosition:0,newest});
const result=JSON.parse(fs.readFileSync(out+'/mixed.json','utf8'));
assert.ok(result.phases.quietPoisson.rows.length>0);
assert.ok(result.phases.readPoisson.rows.length>0);
assert.equal(result.phases.readPoisson.readers.samples.length,4);
console.log('Harness-only scheduling/cut smoke passed; not a database gate');
