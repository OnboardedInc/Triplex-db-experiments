// [CX-VQNODELAY] Why: exercise real transports and structured P2Q classification, including non-transport controls.
// Rejected: checking that both requests reject without inspecting their causes or socket lifecycle.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { makeQleverClient, QleverHttpError, qleverConnectionModeOf } from '../../../packages/qlever/src/QleverClient.ts';
import { QLEVER_ERROR_CODE_TABLE, qleverTransportCodes } from './reference/transport-codes.ts';
import { delay, start, finish, fds, modes } from './common.mjs';
const report = { ...start(['lab/verify/QNODELAY/transport.mjs','lab/verify/QNODELAY/reference/p2q-errors.ts','lab/verify/QNODELAY/reference/transport-codes.ts','lab/verify/QNODELAY/reference/p2q-client.ts']), classification: 'LOCAL TRANSPORT QA; no engine writes or performance admission', p2qReferenceHead: '1096fb8639903395593954e44be6872118fe4c68', checks: [], cases: [], catalog: [] };
// Exact P2Q classifier body; only its imported classes are supplied as fixture stand-ins.
// The reviewed branch has no broker classes; this is classifier parity, not integrated broker qualification.
const original = fs.readFileSync('lab/verify/QNODELAY/reference/p2q-errors.ts','utf8').split('export const isUnreachable = ')[1];
const compiled = stripTypeScriptTypes('const classify = ' + original + '\n', { mode: 'transform' });
class BasisNotAvailable extends Error {}
class QleverRequestError extends Error {}
class QleverDecodeError extends Error {}
const classify = new Function('qleverTransportCodes','BasisNotAvailable','QleverHttpError','QleverRequestError','QleverDecodeError',compiled + '\nreturn classify;')(qleverTransportCodes,BasisNotAvailable,QleverHttpError,QleverRequestError,QleverDecodeError);
const check = (id, ok, detail) => report.checks.push({ id, ok, detail });
const chain = error => {
  const a = [], seen = new Set();
  for (let e=error;e && !seen.has(e) && a.length<32;e=e.cause) { seen.add(e); a.push({ name: e.name, code: e.code ?? null, message: e.message, status: e.status ?? null, body: e.body ?? null }); }
  return a;
};
const listen = async handler => {
  const server = http.createServer(handler);
  server.on('upgrade', (_req, socket) => socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return { server, url:`http://127.0.0.1:${server.address().port}` };
};
const stop = async server => { server.closeAllConnections(); await new Promise(r=>server.close(r)); };
const rows = nonce => [{ x: { type:'literal',value:nonce } }];
const body = nonce => JSON.stringify({results:{bindings:rows(nonce)}});
// Long run: server-side connection events and live sockets are the independent counters.
for (const mode of modes) {
  const sockets = new Set(), requests = [], open = new Set();
  const {server,url} = await listen((req,res)=>{req.resume();req.on('end',()=>{ requests.push(req.socket); res.end(body(req.headers['query-id'])); });});
  server.on('connection',s=>{sockets.add(s);open.add(s);s.once('close',()=>open.delete(s));});
  const client = makeQleverClient(url,{connectionMode:mode});
  const snapshots = [];
  try {
    for (let i=0;i<10000;i++) {
      const nonce = `${report.id}/${mode}/${i}`;
      const value = await client.query('SELECT ?x WHERE {}',{queryId:nonce});
      assert.deepEqual(value,rows(nonce));
      if ((i+1)%1000===0) { await delay(5); snapshots.push({n:i+1,accepted:sockets.size,open:open.size,...fds()}); }
    }
    await delay(100);
    check(`${mode}/10000-contents`,requests.length===10000,{requests:requests.length});
    check(`${mode}/connection-count`,mode==='per-request'?sockets.size===10000:sockets.size<10,{accepted:sockets.size});
    check(`${mode}/bounded-descriptors`,snapshots.every(s=>s.numericDescriptors<=snapshots[0].numericDescriptors+2),snapshots);
    check(`${mode}/socket-lifecycle`,mode==='per-request'?open.size===0:open.size<=2,{open:open.size});
  } finally { await client.close(); await stop(server); }
}
delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;
check('absent-default',qleverConnectionModeOf()==='keep-alive');
process.env.TRIPLEX_QLEVER_CONNECTION_MODE='per-request';
check('explicit-selection-over-env',qleverConnectionModeOf('keep-alive')==='keep-alive');
delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;
const scenarios = [
  'http400','http403','http500','empty204','bad-json','byte-limit','reset-before','truncated-body',
  'timeout-headers','timeout-body','abort-default','abort-error','abort-string','preabort-error','gzip',
];
for (const scenario of scenarios) {
  const observations=[];
  for (const mode of modes) {
    const nonce=`${report.id}/${scenario}/${mode}`;
    const {server,url}=await listen((req,res)=>{req.resume();req.on('end',()=>{
      if (scenario.startsWith('http')) {res.writeHead(Number(scenario.slice(4)));res.end(JSON.stringify({error:'fixture',nonce}));}
      else if (scenario==='empty204') {res.writeHead(204);res.end();}
      else if (scenario==='bad-json') res.end('not json');
      else if (scenario==='reset-before') req.socket.destroy();
      else if (scenario==='truncated-body') { res.writeHead(200,{'Content-Length':'10000'}); res.write('{"results":'); setTimeout(()=>res.destroy(),5); }
      else if (scenario==='timeout-headers' || scenario.startsWith('abort') || scenario.startsWith('preabort')) {}
      else if (scenario==='timeout-body') {res.writeHead(200);res.flushHeaders();}
      else if (scenario==='gzip') {res.writeHead(200,{'Content-Encoding':'gzip'});res.end(gzipSync(body(nonce)));}
      else res.end(body(nonce));
    });});
    const client=makeQleverClient(url,{connectionMode:mode});
    const controller=new AbortController();
    const abort=()=>controller.abort(scenario.endsWith('error')?new Error('caller-stop'):scenario.endsWith('string')?'caller-stop':undefined);
    let timer;
    if (scenario.startsWith('preabort')) abort(); else if (scenario.startsWith('abort')) timer=setTimeout(abort,20);
    try {
      const value=await client.query('SELECT ?x WHERE {}',{queryId:nonce,timeoutMs:scenario.startsWith('timeout')?20:2000,...(scenario==='byte-limit'?{maxResponseBytes:1}:{}),signal:controller.signal});
      observations.push({mode,outcome:'resolved',value,contentEqual:JSON.stringify(value)===JSON.stringify(rows(nonce))});
    } catch(e) {observations.push({mode,outcome:'rejected',unreachable:classify(e),chain:chain(e)});}
    finally {clearTimeout(timer);await client.close();await stop(server);}
  }
  report.cases.push({scenario,observations});
  check(`${scenario}/classification-parity`,observations[0].outcome===observations[1].outcome && observations[0].unreachable===observations[1].unreachable,observations.map(o=>({mode:o.mode,outcome:o.outcome,unreachable:o.unreachable})));
}
// Every P2Q audited transport AND negative code, direct and nested, through a real Node socket.
// Ephemeral origins prevent fetch-pool reuse; one error is injected after connection establishment.
for (const {code,transport} of QLEVER_ERROR_CODE_TABLE) for (const depth of [0,1]) for (const mode of modes) {
  const {server,url}=await listen(()=>{});
  const client=makeQleverClient(url,{connectionMode:mode});
  const connect=net.Socket.prototype.connect;
  let injected=0;
  net.Socket.prototype.connect=function(...args) {
    const socket=connect.apply(this,args);
    if (!injected) { injected++; this.once('connect',()=>setImmediate(()=>{
      const leaf=Object.assign(new Error('opaque'),{code});
      this.destroy(depth===0?leaf:new TypeError('opaque',{cause:leaf}));
    })); }
    return socket;
  };
  try {
    await client.command('fixture',{timeoutMs:2000});
    report.catalog.push({code,depth,mode,transport,injected,outcome:'unexpected resolution'});
  } catch(e) {
    const causes=chain(e), actual=classify(e);
    report.catalog.push({code,depth,mode,transport,injected,actual,codePreserved:causes.some(c=>c.code===code),chain:causes});
  } finally { net.Socket.prototype.connect=connect; await client.close(); await stop(server); }
}
check('catalog-propagation-and-classification',report.catalog.every(r=>r.injected===1 && r.codePreserved && r.actual===r.transport),{codes:QLEVER_ERROR_CODE_TABLE.length,cases:report.catalog.length,failed:report.catalog.filter(r=>r.injected!==1 || !r.codePreserved || r.actual!==r.transport)});
report.completedCollection=true;
finish('lab/verify/QNODELAY/transport-result.json',report);
console.log(JSON.stringify({checks:report.checks,caseCount:report.cases.length,catalogCount:report.catalog.length},null,2));
process.exitCode=report.checks.some(c=>!c.ok)?1:0;
