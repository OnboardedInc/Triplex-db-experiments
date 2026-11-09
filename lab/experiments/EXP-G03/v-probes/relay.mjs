// [EXP-G03] Why: compare the G03 byte-pipe shape with a durable byte-capturing relay under the same trace. Rejected: throughput alone as a bottleneck proof (requires engine CPU evidence too).
import net from 'node:net';
import fs from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
const mode=process.argv[2], root=process.env.PROBE_ROOT??'/work', attempt=process.env.PROBE_ATTEMPT;
if(!attempt) throw Error('attempt required');
const finish=data=>{const raw=JSON.stringify({attempt,op:'V6',data});fs.writeFileSync(`${root}/${mode}.json`,raw);console.log(raw)};
if(mode==='reader') {
 const url=process.env.PROBE_URL, query=process.env.PROBE_QUERY;
 if(!url||!query) throw Error('explicit URL/query required');
 const started=process.hrtime.bigint(), until=started+BigInt(process.env.PROBE_DURATION_MS??30000)*1_000_000n, counts=Array(256).fill(0), errors=[];
 await Promise.all(counts.map(async(_,i)=>{while(process.hrtime.bigint()<until){try {
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/sparql-query','Accept':'application/sparql-results+json'},body:query,signal:AbortSignal.timeout(10000)});
 const b=await r.arrayBuffer(); if(!r.ok||!b.byteLength)throw Error(`HTTP ${r.status}`);
 const answer=JSON.parse(Buffer.from(b));if(answer.results?.bindings?.length!==1||answer.results.bindings[0]?.n?.value!=='10000')throw Error('wrong 1000-subject/10000-fact SELECT count');counts[i]++;
 }catch(e){errors.push(String(e));break}}}));
 finish({counts,errors,elapsedNs:String(process.hrtime.bigint()-started),querySha256:createHash('sha256').update(query).digest('hex')});
} else {
 const [host,port]=process.env.PROBE_UPSTREAM.split(':');let bytes=0,seq=0,head='0'.repeat(64),errors=[];
 const key=Buffer.from(process.env.PROBE_CAPTURE_KEY,'hex');
 const log=fs.openSync(`${root}/capture.ndjson`,'wx');
 function capture(direction,b){bytes+=b.length;if(mode==='capture'){
 const record={attempt,seq:seq++,direction,tMono:String(process.hrtime.bigint()),prev:head,base64:b.toString('base64')};
 const raw=JSON.stringify(record);head=createHmac('sha256',key).update(raw).digest('hex');fs.writeSync(log,JSON.stringify({record,hmac:head})+'\n');}}
 const server=net.createServer(s=>{const u=net.connect({host,port:Number(port)});s.on('data',b=>capture('up',b));u.on('data',b=>capture('down',b));s.pipe(u);u.pipe(s);s.on('error',e=>{errors.push(String(e));u.destroy()});u.on('error',e=>{errors.push(String(e));s.destroy()});s.on('close',()=>u.destroy());u.on('close',()=>s.destroy())});
 server.listen(Number(process.env.PROBE_PORT??7019),'0.0.0.0',()=>fs.writeFileSync(`${root}/relay-ready`,attempt));
 const timer=setInterval(()=>{if(fs.existsSync(`${root}/stop`)){clearInterval(timer);server.close();fs.fdatasyncSync(log);fs.closeSync(log);finish({bytes,seq,head,errors});process.exit(0)}},10);
}
