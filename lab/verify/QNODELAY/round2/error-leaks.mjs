// [CX-VQNODELAY-R2] Why: exercise dispatcher cleanup on rejected responses as well as successful queries.
// Rejected: inferring error-path socket closure from success-only longevity tests.
import http from 'node:http';
import assert from 'node:assert/strict';
import { makeQleverClient,QleverHttpError } from '../../../../packages/qlever/src/QleverClient.ts';
import { start,finish,delay,fds,modes } from './common.mjs';
const report={...start(['lab/verify/QNODELAY/round2/error-leaks.mjs']),classification:'LOCAL ERROR-PATH LIFECYCLE ONLY',modes:[]};
for(const mode of modes) {
  let accepted=0;const open=new Set(),ids=new Set();
  const server=http.createServer((req,res)=>{req.resume();req.on('end',()=>{
    const nonce=req.headers['query-id'];assert(!ids.has(nonce));ids.add(nonce);
    const kind=new URL(req.url,'http://fixture').searchParams.get('cmd');
    if(kind==='deadline')return;
    if(kind==='http500'){res.writeHead(500);res.end(JSON.stringify({nonce}));return;}
    if(kind==='bad-gzip'){res.writeHead(200,{'Content-Encoding':'gzip'});res.end('bad compressed body');return;}
    res.end(JSON.stringify({nonce,payload:'v'.repeat(4096)}));
  });});
  server.on('connection',s=>{accepted++;open.add(s);s.once('close',()=>open.delete(s));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const client=makeQleverClient(`http://127.0.0.1:${server.address().port}`,{connectionMode:mode});
  const samples=[],counts={};
  try {
    for(let i=0;i<1000;i++) {
      const kind=['http500','bad-gzip','budget','deadline'][i%4],nonce=`${report.id}/${mode}/${i}`;
      let rejected=false;
      try {await client.command(kind,{queryId:nonce,timeoutMs:kind==='deadline'?10:1000,...(kind==='budget'?{maxResponseBytes:10}:{})});}
      catch(e){
        rejected=true;counts[kind]=(counts[kind]??0)+1;
        if(kind==='http500'){assert(e instanceof QleverHttpError);assert.deepEqual(e.body,{nonce});}
        else if(kind==='budget')assert(e instanceof RangeError);
        else if(kind==='deadline')assert.equal(e.name,'TimeoutError');
        else assert.equal(e.cause.code,'Z_DATA_ERROR');
      }
      assert(rejected);
      if((i+1)%100===0){await delay(30);samples.push({n:i+1,accepted,open:open.size,...fds()});}
    }
    assert.equal(ids.size,1000);
    assert(samples.every(s=>s.numericDescriptors<=samples[0].numericDescriptors+2));
    if(mode==='per-request'){assert.equal(accepted,1000);assert.equal(open.size,0);}
    else assert(open.size<=2);
    report.modes.push({mode,counts,accepted,openAtEnd:open.size,samples});
  }finally{await client.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
finish('lab/verify/QNODELAY/round2/error-leaks.json',report);
console.log(JSON.stringify(report,null,2));
